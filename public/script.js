const webroot = document.querySelector("meta[name='webroot']").content;
const fileInput = document.querySelector('input[type="file"]');
const dropZone = document.getElementById("dropzone");
const convertButton = document.querySelector("input[type='submit']");
const fileNames = [];
let fileType;
let pendingFiles = 0;
let formatSelected = false;

// ─────────────────────────────────────
// Antivirus toggle UI (custom slider)
// ─────────────────────────────────────

let avToggleButton = null;
let avToggleLabel = null;

// Inject minimal CSS so the toggle looks like a real slider
function injectAvToggleStyles() {
  if (document.getElementById("av-toggle-styles")) return;

  const style = document.createElement("style");
  style.id = "av-toggle-styles";
  style.textContent = `
    .av-toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    /* Light theme (default) */
    .av-toggle-label {
      color: #04070e;
      transition: color 0.15s ease;
    }

    /* Dark theme: make label white */
    html[data-theme="dark"] .av-toggle-label {
      color: #ffffff;
    }

    .av-toggle-switch {
      position: relative;
      width: 42px;
      height: 22px;
      border-radius: 999px;
      border: none;
      background-color: #4b5563;
      padding: 0;
      cursor: pointer;
      transition: background-color 0.2s ease;
      display: inline-flex;
      align-items: center;
    }
    .av-toggle-switch::before {
      content: "";
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background-color: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      left: 2px;
      transition: transform 0.2s ease;
    }
    .av-toggle-switch.av-on {
      background-color: #22c55e;
    }
    .av-toggle-switch.av-on::before {
      transform: translateX(20px);
    }
    .av-toggle-switch.av-disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}

function setAntivirusToggleVisual(enabled, available) {
  if (!avToggleButton) return;

  avToggleButton.classList.remove("av-on", "av-disabled");

  if (!available) {
    avToggleButton.classList.add("av-disabled");
    avToggleButton.setAttribute("aria-disabled", "true");
    avToggleButton.setAttribute("aria-pressed", "false");
    if (avToggleLabel) {
      avToggleLabel.textContent =
        "Antivirus scan unavailable (CLAMAV_URL not set)";
    }
    return;
  }

  avToggleButton.setAttribute("aria-disabled", "false");

  if (enabled) {
    avToggleButton.classList.add("av-on");
    avToggleButton.setAttribute("aria-pressed", "true");
  } else {
    avToggleButton.setAttribute("aria-pressed", "false");
  }

  if (avToggleLabel) {
    avToggleLabel.textContent = "Enable antivirus scan";
  }
}

function initAntivirusToggleState() {
  if (!avToggleButton) return;

  fetch(`${webroot}/api/antivirus`)
    .then((res) => res.json())
    .then((data) => {
      console.log("Antivirus state from server:", data);
      const available = !!data.available;
      const enabled = !!data.enabled;
      setAntivirusToggleVisual(enabled, available);
    })
    .catch((err) => {
      console.error("Failed to get antivirus state:", err);
      setAntivirusToggleVisual(false, false);
      if (avToggleLabel) {
        avToggleLabel.textContent = "Antivirus scan status unavailable";
      }
    });

  avToggleButton.addEventListener("click", () => {
    const isDisabled = avToggleButton.classList.contains("av-disabled");
    if (isDisabled) return;

    const currentlyOn = avToggleButton.classList.contains("av-on");
    const newValue = !currentlyOn;

    fetch(`${webroot}/api/antivirus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Antivirus updated state:", data);
        const available = !!data.available;
        const enabled = !!data.enabled;
        setAntivirusToggleVisual(enabled, available);
      })
      .catch((err) => {
        console.error("Failed to update antivirus state:", err);
        // On error, do not visually toggle
      });
  });
}

function createAntivirusToggle() {
  injectAvToggleStyles();

  const form = document.querySelector("form");
  if (!form) return;
  if (document.getElementById("av-toggle-wrapper")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "av-toggle-wrapper";
  wrapper.className = "av-toggle-wrapper";

  const labelSpan = document.createElement("span");
  labelSpan.id = "av-toggle-label";
  labelSpan.className = "av-toggle-label";
  labelSpan.textContent = "Enable antivirus scan";

  const button = document.createElement("button");
  button.type = "button";
  button.id = "av-toggle";
  button.className = "av-toggle-switch";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-disabled", "true");

  wrapper.appendChild(labelSpan);
  wrapper.appendChild(button);

  // Insert at top of form so it's visible above dropzone
  form.insertBefore(wrapper, form.firstChild);

  avToggleButton = button;
  avToggleLabel = labelSpan;

  initAntivirusToggleState();
}

// Create the antivirus toggle as soon as script runs
createAntivirusToggle();

// ─────────────────────────────────────
// Existing upload UI logic
// ─────────────────────────────────────

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = e.dataTransfer.files;

  if (files.length === 0) {
    console.warn("No files dropped — likely a URL or unsupported source.");
    return;
  }

  for (const file of files) {
    console.log("Handling dropped file:", file.name);
    handleFile(file);
  }
});

function handleFile(file) {
  const fileList = document.querySelector("#file-list");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${file.name}</td>
    <td><progress max="100" class="inline-block h-2 appearance-none overflow-hidden rounded-full border-0 bg-neutral-700 bg-none text-accent-500 accent-accent-500 [&::-moz-progress-bar]:bg-accent-500 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:[background:none] [&[value]::-webkit-progress-value]:bg-accent-500 [&[value]::-webkit-progress-value]:transition-[inline-size]"></progress></td>
    <td>${(file.size / 1024).toFixed(2)} kB</td>
    <td><a onclick="deleteRow(this)">Remove</a></td>
  `;

  if (!fileType) {
    fileType = file.name.split(".").pop();
    fileInput.setAttribute("accept", `.${fileType}`);
    setTitle();

    fetch(`${webroot}/conversions`, {
      method: "POST",
      body: JSON.stringify({ fileType }),
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.text())
      .then((html) => {
        selectContainer.innerHTML = html;
        updateSearchBar();
      })
      .catch(console.error);
  }

  fileList.appendChild(row);
  file.htmlRow = row;
  fileNames.push(file.name);
  uploadFile(file);
}

const selectContainer = document.querySelector("form .select_container");

const updateSearchBar = () => {
  const convertToInput = document.querySelector("input[name='convert_to_search']");
  const convertToPopup = document.querySelector(".convert_to_popup");
  const convertToGroupElements = document.querySelectorAll(".convert_to_group");
  const convertToGroups = {};
  const convertToElement = document.querySelector("select[name='convert_to']");

  const showMatching = (search) => {
    for (const [targets, groupElement] of Object.values(convertToGroups)) {
      let matchingTargetsFound = 0;
      for (const target of targets) {
        if (target.dataset.target.includes(search)) {
          matchingTargetsFound++;
          target.classList.remove("hidden");
          target.classList.add("flex");
        } else {
          target.classList.add("hidden");
          target.classList.remove("flex");
        }
      }

      if (matchingTargetsFound === 0) {
        groupElement.classList.add("hidden");
        groupElement.classList.remove("flex");
      } else {
        groupElement.classList.remove("hidden");
        groupElement.classList.add("flex");
      }
    }
  };

  for (const groupElement of convertToGroupElements) {
    const groupName = groupElement.dataset.converter;

    const targetElements = groupElement.querySelectorAll(".target");
    const targets = Array.from(targetElements);

    for (const target of targets) {
      target.onmousedown = () => {
        convertToElement.value = target.dataset.value;
        convertToInput.value = `${target.dataset.target} using ${target.dataset.converter}`;
        formatSelected = true;
        if (pendingFiles === 0 && fileNames.length > 0) {
          convertButton.disabled = false;
        }
        showMatching("");
      };
    }

    convertToGroups[groupName] = [targets, groupElement];
  }

  convertToInput.addEventListener("input", (e) => {
    showMatching(e.target.value.toLowerCase());
  });

  convertToInput.addEventListener("search", () => {
    convertButton.disabled = true;
    formatSelected = false;
  });

  convertToInput.addEventListener("blur", (e) => {
    if (e?.relatedTarget?.classList?.contains("target")) {
      convertToPopup.classList.add("hidden");
      convertToPopup.classList.remove("flex");
      return;
    }

    convertToPopup.classList.add("hidden");
    convertToPopup.classList.remove("flex");
  });

  convertToInput.addEventListener("focus", () => {
    convertToPopup.classList.remove("hidden");
    convertToPopup.classList.add("flex");
  });
};

fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  for (const file of files) {
    handleFile(file);
  }
});

const setTitle = () => {
  const title = document.querySelector("h1");
  title.textContent = `Convert ${fileType ? `.${fileType}` : ""}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deleteRow = (target) => {
  const filename = target.parentElement.parentElement.children[0].textContent;
  const row = target.parentElement.parentElement;
  row.remove();

  const index = fileNames.indexOf(filename);
  if (index !== -1) {
    fileNames.splice(index, 1);
  }

  fileInput.value = "";

  if (fileNames.length === 0) {
    fileType = null;
    fileInput.removeAttribute("accept");
    convertButton.disabled = true;
    setTitle();
  }

  fetch(`${webroot}/delete`, {
    method: "POST",
    body: JSON.stringify({ filename: filename }),
    headers: {
      "Content-Type": "application/json",
    },
  }).catch((err) => console.log(err));
};

const uploadFile = (file) => {
  convertButton.disabled = true;
  convertButton.textContent = "Uploading...";
  pendingFiles += 1;

  const formData = new FormData();
  formData.append("file", file, file.name);

  let xhr = new XMLHttpRequest();

  xhr.open("POST", `${webroot}/upload`, true);

  xhr.onload = () => {
    pendingFiles -= 1;

    // 🔍 1) Log exactly what the browser got
    console.log("Upload raw response:", xhr.status, xhr.responseText);

    let data = {};
    try {
      data = JSON.parse(xhr.responseText || "{}");
    } catch (e) {
      console.error("Failed to parse upload response:", e, xhr.responseText);
    }

    // 🔍 2) Compute an "infected" flag as robustly as possible
    const isInfected =
      (typeof data === "object" &&
        data !== null &&
        (data.infected === true ||
          data.infected === "true" ||
          (typeof data.message === "string" &&
            data.message.toLowerCase().includes("infected file found")))) ||
      (typeof xhr.responseText === "string" &&
        xhr.responseText.toLowerCase().includes("infected file found"));

    // 🔴 3) If backend reports infection, show popup and stop
    if (xhr.status >= 200 && xhr.status < 300 && isInfected) {
      const infectedFiles = data.infectedFiles || [];
      const details = infectedFiles
        .map((f) =>
          `${f.name}: ${
            Array.isArray(f.viruses) && f.viruses.length
              ? f.viruses.join(", ")
              : "malware detected"
          }`,
        )
        .join("\n");

      alert(
        "⚠️ Infected file found. Conversion will be aborted.\n\n" +
          (details ? "Details:\n" + details : ""),
      );

      // Remove row for this file
      if (file.htmlRow && file.htmlRow.remove) {
        file.htmlRow.remove();
      }

      // Remove from internal list
      const idx = fileNames.indexOf(file.name);
      if (idx !== -1) {
        fileNames.splice(idx, 1);
      }

      if (fileNames.length === 0) {
        fileType = null;
        fileInput.removeAttribute("accept");
        setTitle();
        convertButton.disabled = true;
      } else if (pendingFiles === 0 && formatSelected) {
        convertButton.disabled = false;
      }

      convertButton.textContent = "Convert";

      const progressbar = file.htmlRow?.getElementsByTagName("progress");
      if (progressbar && progressbar[0]?.parentElement) {
        progressbar[0].parentElement.remove();
      }

      return;
    }

    // Generic HTTP error
    if (xhr.status !== 200) {
      console.error("Upload failed:", xhr.status, xhr.responseText);
      alert("Upload failed. Please try again.");
      convertButton.disabled = false;
      convertButton.textContent = "Upload failed";

      const progressbar = file.htmlRow.getElementsByTagName("progress");
      if (progressbar[0]?.parentElement) {
        progressbar[0].parentElement.remove();
      }
      return;
    }

    // Clean upload
    if (pendingFiles === 0) {
      if (formatSelected && fileNames.length > 0) {
        convertButton.disabled = false;
      }
      convertButton.textContent = "Convert";
    }

    const progressbar = file.htmlRow.getElementsByTagName("progress");
    if (progressbar[0]?.parentElement) {
      progressbar[0].parentElement.remove();
    }
    console.log("Upload parsed response:", data);
  };

  xhr.upload.onprogress = (e) => {
    let sent = e.loaded;
    let total = e.total;
    console.log(`upload progress (${file.name}):`, (100 * sent) / total);

    let progressbar = file.htmlRow.getElementsByTagName("progress");
    if (progressbar[0]) {
      progressbar[0].value = (100 * sent) / total;
    }
  };

  xhr.onerror = (e) => {
    console.log("XHR error:", e);
    alert("Upload failed due to a network error.");
    convertButton.disabled = false;
    convertButton.textContent = "Upload failed";
  };

  xhr.send(formData);
};

const formConvert = document.querySelector(`form[action='${webroot}/convert']`);

if (formConvert) {
  formConvert.addEventListener("submit", () => {
    console.log("Submitting convert form with files:", fileNames);
    const hiddenInput = document.querySelector("input[name='file_names']");
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(fileNames);
    } else {
      console.warn(
        "Hidden input 'file_names' not found – form will submit without it.",
      );
    }
  });
}

updateSearchBar();

/* ------------------------------------------------------------------
 * Theme toggle (Light / Dark) in header, before "History"
 * ------------------------------------------------------------------ */

const THEME_STORAGE_KEY = "convertx-theme";

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme"); // original light theme
  }
}

function initThemeFromPreference() {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    // ignore
  }

  const initial =
    stored === "dark" || stored === "light" ? stored : "light";

  applyTheme(initial);
  return initial;
}

function createThemeToggle(initialTheme) {
  if (document.querySelector(".cx-theme-toggle")) return;

  const container = document.createElement("span");
  container.className = "cx-theme-toggle";

  container.innerHTML = `
    <span class="cx-theme-toggle__label">${
      initialTheme === "dark" ? "Dark" : "Light"
    }</span>
    <button
      type="button"
      class="cx-switch ${initialTheme === "dark" ? "cx-switch--on" : ""}"
      aria-label="Toggle dark mode"
    >
      <span class="cx-switch__thumb"></span>
    </button>
  `;

  const switchEl = container.querySelector(".cx-switch");
  const labelEl = container.querySelector(".cx-theme-toggle__label");

  switchEl.addEventListener("click", () => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";

    applyTheme(newTheme);

    if (newTheme === "dark") {
      switchEl.classList.add("cx-switch--on");
      labelEl.textContent = "Dark";
    } else {
      switchEl.classList.remove("cx-switch--on");
      labelEl.textContent = "Light";
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      // ignore
    }
  });

  // Insert in header before the "History" link
  const links = Array.from(document.querySelectorAll("header a, nav a"));
  const historyLink = links.find(
    (a) => a.textContent.trim() === "History",
  );

  if (historyLink && historyLink.parentNode) {
    historyLink.parentNode.insertBefore(container, historyLink);
  } else {
    const header = document.querySelector("header");
    if (header) {
      header.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }
}

// Initialise theme toggle once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const initialTheme = initThemeFromPreference();
  createThemeToggle(initialTheme);
});

