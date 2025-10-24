import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

if (projects && projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');

  // Step 1.6: Count the number of projects
  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent += ` (${projects.length})`;
  }
}