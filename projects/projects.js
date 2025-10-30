import { fetchJSON, renderProjects } from '../global.js';

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "../"
    : "/portfolio/";

const projects = await fetchJSON(`${BASE_PATH}lib/projects.json`);
const projectsContainer = document.querySelector('.projects');

if (projects && projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');

  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent += ` (${projects.length})`;
  }
}

// D3 PIE CHART ===

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let data = [1, 2, 3, 4, 5, 5];

let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);

let arcs = arcData.map((d) => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, idx) => {
  d3.select('#projects-pie-plot')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(idx));
});