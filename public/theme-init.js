// public/theme-init.js
// Runs on every page and applies the saved theme *before* the page renders.

(function () {
  var STORAGE_KEY = "convertx-theme";

  try {
    var theme = localStorage.getItem(STORAGE_KEY);

    // default to light if nothing stored or value is invalid
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch {
    // If localStorage is blocked, just fall back to light theme
    document.documentElement.removeAttribute("data-theme");
  }
})();

