import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "./"
    : "/portfolio/";

async function displayLatestProjects() {
  const projectsContainer = document.querySelector('.projects');
  const projects = await fetchJSON(`${BASE_PATH}lib/projects.json`);
  const latestProjects = projects.slice(0, 3);
  renderProjects(latestProjects, projectsContainer, 'h2');
}

displayLatestProjects();

async function displayGitHubStats() {
  const githubData = await fetchGitHubData('MaayahGa');
  const profileStats = document.querySelector('#profile-stats');
  
  if (profileStats) {
    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  }
}

displayGitHubStats();