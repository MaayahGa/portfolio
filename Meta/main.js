import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Formatting helpers
const fmtNumber = (n) => (n == null || Number.isNaN(n) ? '—' : n.toLocaleString());
const fmtPercent = (v) => (v == null ? '—' : (100 * v).toFixed(1) + '%');

// Global variables
let commits = [];
let xScale, yScale;
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let filteredCommits = [];

// Load CSV
async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: row.line ? +row.line : null,
    depth: row.depth ? +row.depth : null,
    length: row.length ? +row.length : null,
    date: row.date ? new Date(row.date + 'T00:00' + (row.timezone || '')) : null,
    datetime: row.datetime ? new Date(row.datetime) : null,
  }));
  return data;
}

// Process commits
function processCommits(data) {
  const commits = d3.groups(data, (d) => d.commit).map(([commitId, lines]) => {
    const first = lines[0] || {};
    const { author, datetime } = first;
    const dt = datetime ? new Date(datetime) : null;
    const hourFrac = dt ? dt.getHours() + dt.getMinutes() / 60 : null;
    const ret = {
      id: commitId,
      url: 'https://github.com/MaayahGa/portfolio/commit/' + commitId,
      author,
      datetime: dt,
      hourFrac,
      totalLines: lines.length,
    };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      writable: false,
      enumerable: false
    });
    return ret;
  });
  
  // Sort commits by datetime for proper scrollytelling order
  return commits.sort((a, b) => a.datetime - b.datetime);
}

// Event handler for time slider
function onTimeSliderChange() {
  const slider = document.getElementById('commit-progress');
  commitProgress = +slider.value;
  
  // Update commitMaxTime using the time scale
  commitMaxTime = timeScale.invert(commitProgress);
  
  // Update the time display
  const timeElement = document.getElementById('commit-time');
  timeElement.textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
  
  // Filter commits
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  
  // Update the scatter plot
  updateScatterPlot(filteredCommits);
  
  // Update file display
  updateFileDisplay(filteredCommits);
}

// Scatterplot rendering with brush
function renderScatterPlot(data, commitsData) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const svg = d3.select('#scatterplot')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commitsData, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  // Dot radius scale
  const [minLines, maxLines] = d3.extent(commitsData, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Sort commits so smaller dots on top
  const sortedCommits = commitsData.slice().sort((a, b) => b.totalLines - a.totalLines);

  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', (d) => {
      if (d.hourFrac >= 5 && d.hourFrac < 12) return 'orange';
      if (d.hourFrac >= 12 && d.hourFrac < 17) return 'gold';
      if (d.hourFrac >= 17 && d.hourFrac < 21) return 'orangered';
      return 'steelblue';
    })
    .style('fill-opacity', 0.7)
    .style('--r', (d) => rScale(d.totalLines))
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => updateTooltipPosition(event))
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // Brush
  const brush = d3.brush()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on('start brush end', brushed);

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  }

  function brushed(event) {
    const selection = event.selection;
    dots.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection ? filteredCommits.filter((d) => isCommitSelected(selection, d)) : [];
    document.getElementById('selection-count').textContent = `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection ? filteredCommits.filter((d) => isCommitSelected(selection, d)) : [];
    const container = document.getElementById('language-breakdown');
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);
    container.innerHTML = '';
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${d3.format('.1~%')(proportion)})</dd>`;
    }
  }
}

// Update scatter plot function
function updateScatterPlot(commitsData) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#scatterplot');

  // Update x scale domain
  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // Clear and update x-axis
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commitsData, (d) => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', (d) => {
      if (d.hourFrac >= 5 && d.hourFrac < 12) return 'orange';
      if (d.hourFrac >= 12 && d.hourFrac < 17) return 'gold';
      if (d.hourFrac >= 17 && d.hourFrac < 21) return 'orangered';
      return 'steelblue';
    })
    .style('fill-opacity', 0.7)
    .style('--r', (d) => rScale(d.totalLines))
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => updateTooltipPosition(event))
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// Update file display function
function updateFileDisplay(filteredCommits) {
  // Get lines from filtered commits
  let lines = filteredCommits.flatMap((d) => d.lines);
  
  // Group by file and sort by number of lines
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);
  
  // Color scale for technology types
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
  // Select and bind data
  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      // This code only runs when the div is initially rendered
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').call((dt) => {
            dt.append('code');
            dt.append('small');
          });
          div.append('dd');
        }),
    );

  // Update file names and line counts
  filesContainer.select('dt > code').text((d) => d.name);
  filesContainer.select('dt > small').text((d) => `${d.lines.length} lines`);

  // Create one div for each line
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}

// Tooltip helpers
function renderTooltipContent(commit) {
  const tooltip = document.getElementById('tooltip');
  tooltip.innerHTML = `
    <strong>Commit:</strong> <a href="${commit.url}" target="_blank">${commit.id}</a><br>
    <strong>Author:</strong> ${commit.author || '—'}<br>
    <strong>Date:</strong> ${commit.datetime?.toLocaleDateString() || '—'}<br>
    <strong>Time:</strong> ${commit.datetime?.toLocaleTimeString() || '—'}<br>
    <strong>Lines edited:</strong> ${commit.totalLines || 0}
  `;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('tooltip').style.display = isVisible ? 'block' : 'none';
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

// Bootstrap
async function bootstrap() {
  const data = await loadData();
  commits = processCommits(data);

  // Create time scale
  timeScale = d3.scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);
  filteredCommits = commits;

  document.getElementById('preview').textContent = 
    `Rows: ${data.length}\nColumns: ${Object.keys(data[0] || {}).join(', ')}`;

  renderScatterPlot(data, commits);

  // Attach event listener to slider
  const slider = document.getElementById('commit-progress');
  slider.addEventListener('input', onTimeSliderChange);

  // Initialize the time display and file display
  onTimeSliderChange();
  
  // Generate scrollytelling content
  generateScrollytellingContent();
  
  // Initialize Scrollama
  initScrollama();
}

// Generate scrollytelling content
function generateScrollytellingContent() {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made <a href="${d.url}" target="_blank">${
          i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
        }</a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(
            d.lines,
            (D) => D.length,
            (d) => d.file,
          ).length
        } files.
        Then I looked over all I had made, and I saw that it was very good.
      `,
    );
}

// Scrollama callback
function onStepEnter(response) {
  const commit = response.element.__data__;
  
  // Update commitMaxTime to the current commit's datetime
  commitMaxTime = commit.datetime;
  
  // Update the slider to match
  commitProgress = timeScale(commitMaxTime);
  const slider = document.getElementById('commit-progress');
  slider.value = commitProgress;
  
  // Update the time display
  const timeElement = document.getElementById('commit-time');
  timeElement.textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
  
  // Filter commits up to this point
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  
  // Update visualizations
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

// Initialize Scrollama
function initScrollama() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);
}

bootstrap().catch(console.error);