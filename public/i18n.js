// Client-side i18n helper
(function () {
  const LOCALE_COOKIE_NAME = "locale";
  const LOCALE_EXPIRY_DAYS = 365;

  // Get current locale from meta tag or cookie
  function getCurrentLocale() {
    const metaLocale = document.querySelector("meta[name='locale']")?.content;
    if (metaLocale) return metaLocale;

    const cookieLocale = getCookie(LOCALE_COOKIE_NAME);
    if (cookieLocale) return cookieLocale;

    return "en";
  }

  // Get cookie value
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  // Set cookie value
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  // Get translation from window.__TRANSLATIONS__
  function t(category, key, params) {
    const translations = window.__TRANSLATIONS__ || {};
    let text = translations[category]?.[key];

    if (!text) {
      console.warn(`Missing translation: ${category}.${key}`);
      return `${category}.${key}`;
    }

    // Interpolate params
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }

    return text;
  }

  // Expose t function globally
  window.t = t;
  window.getCurrentLocale = getCurrentLocale;

  // Language selector functionality
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("language-toggle");
    const dropdown = document.getElementById("language-dropdown");

    if (!toggle || !dropdown) return;

    // Toggle dropdown
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains("hidden");

      if (isOpen) {
        dropdown.classList.add("hidden");
        dropdown.classList.remove("flex");
        toggle.setAttribute("aria-expanded", "false");
      } else {
        dropdown.classList.remove("hidden");
        dropdown.classList.add("flex");
        toggle.setAttribute("aria-expanded", "true");
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!toggle.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
        dropdown.classList.remove("flex");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // Handle language selection
    const options = document.querySelectorAll(".language-option");
    options.forEach((option) => {
      option.addEventListener("click", () => {
        const locale = option.dataset.locale;
        const webroot = option.dataset.webroot || "";

        // Save to cookie
        setCookie(LOCALE_COOKIE_NAME, locale, LOCALE_EXPIRY_DAYS);

        // Reload the page to apply the new locale
        window.location.reload();
      });
    });

    // Keyboard navigation for dropdown
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.click();
      }
    });

    dropdown.addEventListener("keydown", (e) => {
      const items = [...dropdown.querySelectorAll(".language-option")];
      const currentIndex = items.indexOf(document.activeElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1].focus();
          }
          break;
        case "Escape":
          dropdown.classList.add("hidden");
          dropdown.classList.remove("flex");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
          break;
        case "Enter":
        case " ":
          if (document.activeElement.classList.contains("language-option")) {
            document.activeElement.click();
          }
          break;
      }
    });
  });
})();
