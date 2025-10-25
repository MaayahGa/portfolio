import { fetchJSON, renderProjects } from '../global.js';

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