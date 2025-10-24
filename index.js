import { fetchJSON, renderProjects, fetchGithubData } from './global.js';

const projectsContainer = document.querySelector('.projects');

async function displayLatestProjects() {

  const projects = await fetchJSON('../lib/projects.json');


  const latestProjects = projects.slice(0, 3);

  renderProjects(latestProjects, projectsContainer, 'h2');
}

displayLatestProjects();
