import { fetchJSON, renderProjects } from '../global.js';

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "../"
    : "/portfolio/";

const projects = await fetchJSON(`${BASE_PATH}lib/projects.json`);
const projectsContainer = document.querySelector('.projects');

// render projects
if (projects && projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');

  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent += ` (${projects.length})`;
  }
}

//  D3 PIE CHART 

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let colors = d3.scaleOrdinal(d3.schemeTableau10);

function renderPieChart(projectsGiven) {

  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // pie chart slices
  newArcs.forEach((arc, idx) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx));
  });

  // legend
  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

renderPieChart(projects);

let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');

  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent = `Projects (${filteredProjects.length})`;
  }

  renderPieChart(filteredProjects);
});