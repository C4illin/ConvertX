const webroot = document.querySelector("meta[name='webroot']").content;
const fileInput = document.querySelector('input[type="file"]');
const dropZone = document.getElementById("dropzone");
const convertButton = document.querySelector("input[type='submit']");
const fileNames = [];
let fileType;
let pendingFiles = 0;
let formatSelected = false;

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

formConvert.addEventListener("submit", () => {
  const hiddenInput = document.querySelector("input[name='file_names']");
  hiddenInput.value = JSON.stringify(fileNames);
});

updateSearchBar();

