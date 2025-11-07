console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

//Step 3
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "Meta/", title: "Meta" },
  { url: "Gabriel Maayah - Resume.pdf", title: "Resume" },
  { url: "https://github.com/MaayahGa", title: "GitHub" },
];

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

let nav = document.createElement("nav");
document.body.prepend(nav);

function normalize(path) {
  return path.replace(/index\.html$/, '').replace(/\/$/, '');
}

for (let i = 0; i < pages.length; i++) {
  let p = pages[i];
  let url = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  // Highlight page: normalize paths so /Meta/ matches /Meta/index.html
  a.classList.toggle(
    "current",
    a.host === location.host && normalize(a.pathname) === normalize(location.pathname)
  );

  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
  if (i < pages.length - 1) nav.insertAdjacentText("beforeend", " | ");
}

//Step 4
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector(".color-scheme select");

function setColorScheme(scheme) {
  document.documentElement.classList.remove('dark');

  if (scheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (scheme === 'light dark') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }

  select.value = scheme;

  document.documentElement.style.setProperty("color-scheme", scheme.includes('dark') ? 'dark' : 'light');
}

window.addEventListener("DOMContentLoaded", () => {
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }
});

select.addEventListener("input", (event) => {
  const value = event.target.value;
  setColorScheme(value);
  localStorage.colorScheme = value;
});

//Contact updates
const form = document.querySelector("form.contact-form");
form?.addEventListener("submit", function (event) {
  event.preventDefault();

  const data = new FormData(form);
  const params = [];

  for (let [name, value] of data) {
    params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join("&")}`;
  location.href = url;
});

// Fetch and Render
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? ""
      : "/portfolio/";
      
  containerElement.innerHTML = '';

  projects.forEach((project) => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <p class="year">${project.year}</p>
      <img src="${BASE_PATH}${project.image}" alt="${project.title}">
      <p class="description">${project.description}</p>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
