const webroot = document.querySelector("meta[name='webroot']").content;
const urlInput = document.querySelector("#url-input");
const urlSubmit = document.querySelector("#url-submit");
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

const readAllEntries = async (reader) => {
  const entries = [];
  let batch;
  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    entries.push(...batch);
  } while (batch.length > 0);
  return entries;
};

const entryToFiles = async (entry) => {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    if (entry.fullPath) {
      file.filepath = entry.fullPath.replace(/^\/+/, "");
    }
    return [file];
  }
  const reader = entry.createReader();
  const entries = await readAllEntries(reader);
  const out = [];
  for (const child of entries) {
    out.push(...(await entryToFiles(child)));
  }
  return out;
};

const getFileNameWithSlashes = (file) => {
  if (file.filepath) {
    return file.filepath;
  }
  if (file.webkitRelativePath) {
    return file.webkitRelativePath;
  }
  return file.name;
};

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const items = e.dataTransfer.items;

  if (items.length === 0) {
    console.warn("No files dropped — likely a URL or unsupported source.");
    return;
  }

  for (const item of items) {
    const entry = item.webkitGetAsEntry();
    if (!entry) {
      return;
    }
    const files = await entryToFiles(entry);
    for (const file of files) {
      console.log("Handling dropped file:", getFileNameWithSlashes(file));
      handleFile(file);
    }
  }
});

urlSubmit?.addEventListener("click", (e) => {
  e.preventDefault();
  if (urlInput) {
    handleUrl(urlInput.value);
  }
});

function handleUrl(url) {
  if (!url || !url.trim()) return;

  if (urlSubmit) urlSubmit.disabled = true;
  pendingFiles += 1;
  convertButton.disabled = true;
  convertButton.textContent = "Uploading...";

  fetch(`${webroot}/url`, {
    method: "POST",
    body: JSON.stringify({ url: url.trim() }),
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      if (!res.ok) {
        return res.text().then((text) => {
          throw new Error(text || `HTTP ${res.status}`);
        });
      }
      return res.json();
    })
    .then((res) => {
      if (urlInput) urlInput.value = "";
      const fileList = document.querySelector("#file-list");

      const row = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = res.filename;
      row.appendChild(nameTd);

      const emptyTd = document.createElement("td");
      row.appendChild(emptyTd);

      const sizeTd = document.createElement("td");
      sizeTd.textContent = `${(res.fileSizeBytes / 1024).toFixed(2)} kB`;
      row.appendChild(sizeTd);

      const actionTd = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "text-accent-500 hover:underline";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = function () {
        deleteRow(this);
      };
      actionTd.appendChild(removeBtn);
      row.appendChild(actionTd);

      fileList.appendChild(row);
      fileNames.push(res.filename);

      if (!fileType) {
        fileType = res.filename.split(".").pop();
        fileInput.setAttribute("accept", `.${fileType}`);
        setTitle();

        fetch(`${webroot}/conversions`, {
          method: "POST",
          body: JSON.stringify({ fileType }),
          headers: { "Content-Type": "application/json" },
        })
          .then((r) => r.text())
          .then((html) => {
            selectContainer.innerHTML = html;
            updateSearchBar();
          })
          .catch(console.error);
      }
    })
    .catch((err) => {
      console.error(err);
      alert(`Failed to add URL: ${err.message || err}`);
    })
    .finally(() => {
      if (urlSubmit) urlSubmit.disabled = false;
      pendingFiles -= 1;
      if (pendingFiles === 0) {
        convertButton.textContent = "Convert";
        if (formatSelected && fileNames.length > 0) {
          convertButton.disabled = false;
        }
      }
    });
}

// Extracted handleFile function for reusability in drag-and-drop and file input
function handleFile(file) {
  const fileList = document.querySelector("#file-list");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${getFileNameWithSlashes(file)}</td>
    <td><progress max="100" class="inline-block h-2 appearance-none overflow-hidden rounded-full border-0 bg-neutral-700 bg-none text-accent-500 accent-accent-500 [&::-moz-progress-bar]:bg-accent-500 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:[background:none] [&[value]::-webkit-progress-value]:bg-accent-500 [&[value]::-webkit-progress-value]:transition-[inline-size]"></progress></td>
    <td>${(file.size / 1024).toFixed(2)} kB</td>
    <td><button type="button" class="text-accent-500 hover:underline" onclick="deleteRow(this)">Remove</button></td>
  `;

  if (!fileType) {
    fileType = getFileNameWithSlashes(file).split(".").pop();
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
  fileNames.push(getFileNameWithSlashes(file));
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
    // when the user clears the search bar using the 'x' button
    convertButton.disabled = true;
    formatSelected = false;
  });

  convertToInput.addEventListener("blur", (e) => {
    // Keep the popup open even when clicking on a target button
    // for a split second to allow the click to go through
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

// Add a 'change' event listener to the file input element
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

// Add a onclick for the delete button
const deleteRow = (target) => {
  const filename = target.parentElement.parentElement.children[0].textContent;
  const row = target.parentElement.parentElement;
  row.remove();

  // remove from fileNames
  const index = fileNames.indexOf(filename);
  fileNames.splice(index, 1);

  // reset fileInput
  fileInput.value = "";

  // if fileNames is empty, reset fileType
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
  formData.append("file", file, getFileNameWithSlashes(file));

  let xhr = new XMLHttpRequest();

  xhr.open("POST", `${webroot}/upload`, true);

  xhr.onload = () => {
    let data = JSON.parse(xhr.responseText);

    pendingFiles -= 1;
    if (pendingFiles === 0) {
      if (formatSelected) {
        convertButton.disabled = false;
      }
      convertButton.textContent = "Convert";
    }

    //Remove the progress bar when upload is done
    let progressbar = file.htmlRow.getElementsByTagName("progress");
    progressbar[0].parentElement.remove();
    console.log(data);
  };

  xhr.upload.onprogress = (e) => {
    let sent = e.loaded;
    let total = e.total;
    console.log(`upload progress (${getFileNameWithSlashes(file)}):`, (100 * sent) / total);

    let progressbar = file.htmlRow.getElementsByTagName("progress");
    progressbar[0].value = (100 * sent) / total;
  };

  xhr.onerror = (e) => {
    console.log(e);
  };

  xhr.send(formData);
};

const formConvert = document.querySelector(`form[action='${webroot}/convert']`);

formConvert.addEventListener("submit", () => {
  const hiddenInput = document.querySelector("input[name='file_names']");
  hiddenInput.value = JSON.stringify(fileNames);
});

updateSearchBar();
