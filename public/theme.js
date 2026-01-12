/*
 * ConvertX Theme Toggle
 *
 * - Stores explicit user choice in localStorage under KEY.
 * - If no explicit choice exists, the UI follows the OS preference
 *   (prefers-color-scheme) and does not set data-theme.
 */

(() => {
  const KEY = "convertx-theme";
  const root = document.documentElement;

  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");

  const getStoredTheme = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch {
      return null;
    }
  };

  const getSystemTheme = () => (mql && mql.matches ? "dark" : "light");

  const getEffectiveTheme = () => getStoredTheme() ?? getSystemTheme();

  const setTheme = (theme, { persist } = { persist: true }) => {
    if (theme !== "dark" && theme !== "light") return;

    root.setAttribute("data-theme", theme);
    // Hint to the browser for built-in UI (form controls, scrollbars, etc.)
    root.style.colorScheme = theme;

    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch {
        // ignore
      }
    }
  };

  const clearThemeOverride = () => {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  };

  const syncUI = () => {
    const checkbox = document.getElementById("cx-theme-switch");
    const label = document.getElementById("cx-theme-label");

    if (!checkbox && !label) return;

    const theme = getEffectiveTheme();

    if (checkbox) {
      checkbox.checked = theme === "dark";
      checkbox.setAttribute(
        "aria-checked",
        checkbox.checked ? "true" : "false",
      );
    }

    if (label) {
      label.textContent = theme === "dark" ? "Dark" : "Light";
    }
  };

  // --- Initial state ---
  // If the user chose a theme before, enforce it.
  const stored = getStoredTheme();
  if (stored) {
    setTheme(stored, { persist: false });
  }

  // Keep the toggle in sync once the DOM is available.
  document.addEventListener("DOMContentLoaded", () => {
    syncUI();

    const checkbox = document.getElementById("cx-theme-switch");
    if (!checkbox) return;

    checkbox.addEventListener("change", () => {
      // Explicit user choice always overrides system.
      setTheme(checkbox.checked ? "dark" : "light", { persist: true });
      syncUI();
    });
  });

  // If there's no explicit override, reflect OS changes in the UI.
  if (mql) {
    const onChange = () => {
      if (getStoredTheme() == null) {
        clearThemeOverride();
        syncUI();
      }
    };
    // Safari uses addListener/removeListener
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
    }
  }
})();
