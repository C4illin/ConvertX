// ===== Theme Toggle Script =====
// Handles dark/light mode switching with localStorage persistence
// and system preference detection

(function () {
  const THEME_KEY = "theme";

  // Get stored theme or detect system preference
  function getPreferredTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme) {
      return storedTheme;
    }
    // Return null to let CSS handle system preference
    return null;
  }

  // Get current effective theme (what's actually being displayed)
  function getEffectiveTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme) {
      return storedTheme;
    }
    // Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  // Apply theme to document
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      // Remove attribute to follow system preference
      root.removeAttribute("data-theme");
    }
    updateThemeIcons();
  }

  // Update theme toggle icons visibility
  function updateThemeIcons() {
    const effectiveTheme = getEffectiveTheme();
    const lightIcon = document.getElementById("theme-icon-light");
    const darkIcon = document.getElementById("theme-icon-dark");

    if (lightIcon && darkIcon) {
      if (effectiveTheme === "dark") {
        // In dark mode, show sun icon (to switch to light)
        lightIcon.classList.remove("hidden");
        darkIcon.classList.add("hidden");
      } else {
        // In light mode, show moon icon (to switch to dark)
        lightIcon.classList.add("hidden");
        darkIcon.classList.remove("hidden");
      }
    }
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = getEffectiveTheme();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  }

  // Initialize theme on page load
  function initTheme() {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);

    // Listen for system preference changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      // Only update if no manual preference is set
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(null);
      }
    });
  }

  // Apply theme immediately to prevent flash
  const preferredTheme = getPreferredTheme();
  if (preferredTheme) {
    document.documentElement.setAttribute("data-theme", preferredTheme);
  }

  // Set up event listener when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();

    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }
  });

  // Expose toggle function globally for programmatic access
  window.toggleTheme = toggleTheme;
  window.getEffectiveTheme = getEffectiveTheme;
})();
