const appBaseUrl = new URL("../", import.meta.url);
const catalogUrl = new URL("../apps.json", import.meta.url);

const homeView = document.getElementById("homeView");
const workspaceView = document.getElementById("workspaceView");
const categorySections = document.getElementById("categorySections");
const navGroups = document.getElementById("navGroups");
const appFrame = document.getElementById("appFrame");
const appSearch = document.getElementById("appSearch");
const menuToggle = document.getElementById("menuToggle");
const primaryNav = document.getElementById("primaryNav");
const openNewTab = document.getElementById("openNewTab");
const frameLoading = document.getElementById("frameLoading");

let groups = [];
let appsById = new Map();
let currentAppId = null;

document.getElementById("currentYear").textContent = String(new Date().getFullYear());
document.getElementById("backToHome").addEventListener("click", () => navigateHome(true, true));
appSearch.addEventListener("input", renderCatalog);
menuToggle.addEventListener("click", toggleMenu);
appFrame.addEventListener("load", () => { frameLoading.hidden = true; });
window.addEventListener("popstate", routeFromLocation);
window.addEventListener("hashchange", routeFromLocation);

document.addEventListener("click", event => {
  const appLink = event.target.closest("[data-app-id]");
  if (appLink) {
    event.preventDefault();
    navigateToApp(appLink.dataset.appId, true);
    return;
  }

  if (event.target.closest("[data-home-link]")) {
    event.preventDefault();
    navigateHome(true, true);
    return;
  }

  if (!event.target.closest(".site-header")) closeMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMenu();
});

loadCatalog();

async function loadCatalog() {
  try {
    const response = await fetch(catalogUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error("Catalog request failed: " + response.status);
    const catalog = await response.json();
    groups = normalizeGroups(catalog.groups);
    appsById = new Map(groups.flatMap(group => group.items.map(item => [item.id, item])));
    renderNavigation();
    renderCatalog();
    document.getElementById("appCount").textContent =
      appsById.size + " items · organized by category";
    document.getElementById("loadError").hidden = true;
    routeFromLocation();
  } catch (error) {
    console.error(error);
    document.getElementById("loadError").hidden = false;
    document.getElementById("appCount").textContent = "The collection is temporarily unavailable";
  }
}

function normalizeGroups(source) {
  if (!Array.isArray(source)) throw new TypeError("apps.json must contain a groups array");
  const ids = new Set();
  return source.map(group => {
    if (!group || !Array.isArray(group.items)) throw new TypeError("Invalid app group");
    const items = group.items.map(item => {
      if (!item || !item.id || !item.title || !item.path) throw new TypeError("Invalid app item");
      if (ids.has(item.id)) throw new TypeError("Duplicate app id: " + item.id);
      ids.add(item.id);
      return item;
    });
    return { ...group, items };
  });
}

function renderNavigation() {
  navGroups.replaceChildren();

  groups.forEach(group => {
    const details = document.createElement("details");
    details.className = "nav-group";

    const summary = document.createElement("summary");
    summary.textContent = group.title;
    details.append(summary);

    const menu = document.createElement("div");
    menu.className = "nav-group__menu";
    menu.setAttribute("aria-label", group.title);

    group.items.forEach(item => {
      const link = document.createElement("a");
      link.href = appHash(item.id);
      link.dataset.appId = item.id;
      link.textContent = item.title;
      menu.append(link);
    });

    details.append(menu);
    navGroups.append(details);
  });
}

function renderCatalog() {
  const query = appSearch.value.trim().toLocaleLowerCase();
  categorySections.replaceChildren();
  let visibleCount = 0;

  groups.forEach(group => {
    const items = group.items.filter(item =>
      [item.title, item.description, group.title].join(" ").toLocaleLowerCase().includes(query)
    );
    if (!items.length) return;
    visibleCount += items.length;

    const section = document.createElement("section");
    section.className = "category-block";
    section.setAttribute("aria-labelledby", "category-" + group.id);

    const heading = document.createElement("div");
    heading.className = "category-heading";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.id = "category-" + group.id;
    title.textContent = group.title;
    const description = document.createElement("p");
    description.textContent = group.description || "";
    titleWrap.append(title, description);

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = String(items.length).padStart(2, "0");
    heading.append(titleWrap, count);

    const grid = document.createElement("div");
    grid.className = "app-grid";
    items.forEach(item => grid.append(createAppCard(item, group)));

    section.append(heading, grid);
    categorySections.append(section);
  });

  document.getElementById("emptyState").hidden = visibleCount > 0;
  document.getElementById("searchHint").textContent = query
    ? visibleCount + " matching items."
    : "Choose an item to open it in your workspace.";
}

function createAppCard(item, group) {
  const article = document.createElement("article");
  article.className = "app-card";
  article.style.setProperty("--card-accent", group.accent || "var(--accent)");

  const link = document.createElement("a");
  link.className = "app-card__link";
  link.href = appHash(item.id);
  link.dataset.appId = item.id;
  link.setAttribute("aria-label", "Open " + item.title);

  const top = document.createElement("div");
  top.className = "app-card__top";
  const icon = document.createElement("span");
  icon.className = "app-card__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = item.icon || "•";
  const category = document.createElement("span");
  category.className = "app-card__category";
  category.textContent = group.title;
  top.append(icon, category);

  const title = document.createElement("h4");
  title.textContent = item.title;
  const description = document.createElement("p");
  description.textContent = item.description || "";
  const arrow = document.createElement("span");
  arrow.className = "app-card__arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  link.append(top, title, description, arrow);
  article.append(link);
  return article;
}

function navigateToApp(id, addHistory) {
  const item = appsById.get(id);
  if (!item) return navigateHome(false);

  const url = appUrl(item);
  homeView.hidden = true;
  workspaceView.hidden = false;
  document.getElementById("workspaceTitle").textContent = item.title;
  document.getElementById("workspaceGroup").textContent = groupFor(item.id).title;
  appFrame.title = item.title + " — GeDniM workspace";
  openNewTab.href = url.href;
  openNewTab.hidden = false;
  closeMenu();

  if (currentAppId !== item.id) {
    currentAppId = item.id;
    frameLoading.hidden = false;
    appFrame.src = url.href;
  }

  if (addHistory && location.hash !== appHash(id)) {
    history.pushState({ appId: id }, "", location.pathname + location.search + appHash(id));
  }
}

function navigateHome(addHistory, focusHeading = false) {
  currentAppId = null;
  frameLoading.hidden = true;
  appFrame.removeAttribute("src");
  workspaceView.hidden = true;
  homeView.hidden = false;
  openNewTab.hidden = true;
  closeMenu();

  if (addHistory && location.hash !== "#home") {
    history.pushState({ view: "home" }, "", location.pathname + location.search + "#home");
  }
  if (focusHeading) document.getElementById("heroTitle").focus({ preventScroll: true });
}

function routeFromLocation() {
  if (!groups.length) return;
  const match = location.hash.match(/^#app\/(.+)$/);
  if (match) {
    let id = "";
    try { id = decodeURIComponent(match[1]); } catch { return navigateHome(false); }
    return navigateToApp(id, false);
  }
  navigateHome(false);
}

function groupFor(id) {
  return groups.find(group => group.items.some(item => item.id === id)) || groups[0];
}

function appUrl(item) {
  const relativePath = String(item.path).replace(/^\/+/, "").replace(/\/+$/, "");
  return new URL(relativePath + "/index.html", appBaseUrl);
}

function appHash(id) {
  return "#app/" + encodeURIComponent(id);
}

function toggleMenu() {
  const isOpen = primaryNav.dataset.open !== "true";
  primaryNav.dataset.open = String(isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
}

function closeMenu() {
  delete primaryNav.dataset.open;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  primaryNav.querySelectorAll("details[open]").forEach(details => { details.open = false; });
}
