import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Formatting helpers
const fmtNumber = (n) => (n == null || Number.isNaN(n) ? '—' : n.toLocaleString());
const fmtPercent = (v) => (v == null ? '—' : (100 * v).toFixed(1) + '%');

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
  return d3.groups(data, (d) => d.commit).map(([commitId, lines]) => {
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

    Object.defineProperty(ret, 'lines', { value: lines, writable: false, enumerable: false });
    return ret;
  });
}

// Scatterplot rendering with brush
function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const svg = d3.select('#scatterplot')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis);

  // Dot radius scale
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // Sort commits so smaller dots on top
  const sortedCommits = commits.slice().sort((a, b) => b.totalLines - a.totalLines);

  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(sortedCommits)
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
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    document.getElementById('selection-count').textContent =
      `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
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
  const commits = processCommits(data);

  document.getElementById('preview').textContent =
    `Rows: ${data.length}\nColumns: ${Object.keys(data[0] || {}).join(', ')}`;

  renderScatterPlot(data, commits);
}

bootstrap().catch(console.error);
