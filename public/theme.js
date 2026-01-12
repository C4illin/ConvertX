
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

  const applyColorSchemeOnly = (theme) => {
    // Hint to the browser for built-in UI (form controls, scrollbars, etc.)
    root.style.colorScheme = theme === "dark" ? "dark" : "light";
  };

  const setTheme = (theme, { persist } = { persist: true }) => {
    if (theme !== "dark" && theme !== "light") return;

    root.setAttribute("data-theme", theme);
    applyColorSchemeOnly(theme);

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
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    // Important: even in auto-mode we still set color-scheme to system theme.
    applyColorSchemeOnly(getSystemTheme());
  };

  const getEffectiveTheme = () => getStoredTheme() ?? getSystemTheme();

  const syncUI = () => {
    const checkbox = document.getElementById("cx-theme-switch");
    const label = document.getElementById("cx-theme-label");
    if (!checkbox && !label) return;

    const theme = getEffectiveTheme();

    if (checkbox) {
      checkbox.checked = theme === "dark";
      checkbox.setAttribute("aria-checked", checkbox.checked ? "true" : "false");
    }

    if (label) {
      label.textContent = theme === "dark" ? "Dark" : "Light";
    }
  };

  // --- Initial state ---
  const stored = getStoredTheme();

  if (stored) {
    // Explicit override: lock both tokens + native controls.
    setTheme(stored, { persist: false });
  } else {
    // Auto mode: follow OS, but ensure native controls match.
    applyColorSchemeOnly(getSystemTheme());
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncUI();

    const checkbox = document.getElementById("cx-theme-switch");
    if (!checkbox) return;

    checkbox.addEventListener("change", () => {
      setTheme(checkbox.checked ? "dark" : "light", { persist: true });
      syncUI();
    });
  });


  if (mql) {
    const onChange = () => {
      if (getStoredTheme() == null) {
        // Keep auto: no data-theme, but update color-scheme + UI.
        root.removeAttribute("data-theme");
        applyColorSchemeOnly(getSystemTheme());
        syncUI();
      }
    };

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
    }
  }
})();
