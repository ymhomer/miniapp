// Apply the saved theme before CSS paints to avoid a flash on page load.
(() => {
  const root = document.documentElement;
  const storageKey = "gednim-theme";
  let theme = "light";
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") theme = saved;
  } catch { /* Theme switching also works when browser storage is unavailable. */ }

  function applyTheme(value) {
    root.dataset.theme = value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content", value === "light" ? "#f5f4ee" : "#0c1117"
    );
    const button = document.getElementById("themeToggle");
    const label = value === "light" ? "Switch to dark mode" : "Switch to light mode";
    button?.setAttribute("aria-label", label);
    button?.setAttribute("title", label);
  }

  applyTheme(theme);
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(root.dataset.theme);
    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(storageKey, next); } catch { /* Optional persistence. */ }
    });
  });
  window.addEventListener("storage", event => {
    if (event.key === storageKey) {
      applyTheme(event.newValue === "dark" ? "dark" : "light");
    }
  });
})();
