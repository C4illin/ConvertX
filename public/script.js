const webroot = document.querySelector("meta[name='webroot']").content;
const fileInput = document.querySelector('input[type="file"]');
const dropZone = document.getElementById("dropzone");
const convertButton = document.querySelector("input[type='submit']");
const fileNames = [];
let fileType;
let pendingFiles = 0;
let formatSelected = false;

// Get translation helper
const getTranslation = (category, key, params) => {
  if (typeof window.t === "function") {
    return window.t(category, key, params);
  }
  // Fallback to English if t is not available
  const fallbacks = {
    "common.remove": "Remove",
    "convert.title": "Convert",
    "convert.titleWithType": "Convert .{fileType}",
    "convert.convertButton": "Convert",
    "convert.uploading": "Uploading...",
  };
  let text = fallbacks[`${category}.${key}`] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
};

// ===== 全頁拖曳上傳支援（UI 零變動版）=====
// 只監聽 dragover 和 drop，不操作任何 UI class
// 這樣虛線框不會變粗、不會閃爍

// 防重複機制：記錄最近處理的檔案
const recentlyProcessedFiles = new Set();
const getFileKey = (file) => `${file.name}_${file.size}_${file.lastModified}`;
const clearRecentFiles = () => {
  setTimeout(() => recentlyProcessedFiles.clear(), 100);
};

// 全頁 dragover：只做 preventDefault，防止瀏覽器開啟檔案
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

// 全頁 drop：處理檔案上傳
document.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();

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
// ===== 全頁拖曳上傳支援結束 =====

// Extracted handleFile function for reusability in drag-and-drop and file input
function handleFile(file) {
  // 防重複檢查：如果這個檔案剛剛已經處理過，直接跳過
  const fileKey = getFileKey(file);
  if (recentlyProcessedFiles.has(fileKey)) {
    console.log("Skipping duplicate file:", file.name);
    return;
  }
  recentlyProcessedFiles.add(fileKey);
  clearRecentFiles();

  const fileList = document.querySelector("#file-list");
  const removeText = getTranslation("common", "remove");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${file.name}</td>
    <td><progress max="100" class="inline-block h-2 appearance-none overflow-hidden rounded-full border-0 bg-neutral-700 bg-none text-accent-500 accent-accent-500 [&::-moz-progress-bar]:bg-accent-500 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:[background:none] [&[value]::-webkit-progress-value]:bg-accent-500 [&[value]::-webkit-progress-value]:transition-[inline-size]"></progress></td>
    <td>${(file.size / 1024).toFixed(2)} kB</td>
    <td><a onclick="deleteRow(this)">${removeText}</a></td>
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
  if (fileType) {
    title.textContent = getTranslation("convert", "titleWithType", { fileType });
  } else {
    title.textContent = getTranslation("convert", "title");
  }
};

// Add a onclick for the delete button
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// ==================== 全域傳輸常數 ====================
const CHUNK_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 判斷是否需要使用 chunk 傳輸
 */
function shouldUseChunkedUpload(fileSize) {
  return fileSize > CHUNK_THRESHOLD_BYTES;
}

/**
 * 生成 UUID
 */
function generateUploadId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 統一上傳檔案（自動判斷使用直傳或 chunk）
 * 
 * @param {File} file - 要上傳的檔案
 */
const uploadFile = (file) => {
  convertButton.disabled = true;
  convertButton.value = getTranslation("convert", "uploading");
  pendingFiles += 1;

  if (shouldUseChunkedUpload(file.size)) {
    // 大檔：使用 chunk 上傳
    uploadFileChunked(file);
  } else {
    // 小檔：直接上傳
    uploadFileDirect(file);
  }
};

/**
 * 直接上傳（≤10MB）
 */
const uploadFileDirect = (file) => {
  const formData = new FormData();
  formData.append("file", file, file.name);

  let xhr = new XMLHttpRequest();

  xhr.open("POST", `${webroot}/upload`, true);

  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText);
    } catch (e) {
      console.log("Parse error:", e);
    }

    pendingFiles -= 1;
    if (pendingFiles === 0) {
      if (formatSelected) {
        convertButton.disabled = false;
      }
      convertButton.value = getTranslation("convert", "convertButton");
    }

    // Remove the progress bar when upload is done
    let progressbar = file.htmlRow.getElementsByTagName("progress");
    if (progressbar[0]) {
      progressbar[0].parentElement.remove();
    }
    console.log("Direct upload complete:", data);
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
    console.log("Upload error:", e);
    pendingFiles -= 1;
    if (pendingFiles === 0) {
      convertButton.value = getTranslation("convert", "convertButton");
    }
  };

  xhr.send(formData);
};

/**
 * Chunk 上傳（>10MB）
 */
const uploadFileChunked = async (file) => {
  const uploadId = generateUploadId();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);
  
  console.log(`Starting chunked upload: ${file.name}, size: ${file.size}, chunks: ${totalChunks}`);

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("upload_id", uploadId);
      formData.append("chunk_index", chunkIndex.toString());
      formData.append("total_chunks", totalChunks.toString());
      formData.append("file_name", file.name);
      formData.append("total_size", file.size.toString());
      formData.append("chunk", chunk);

      const response = await fetch(`${webroot}/upload-chunk`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed: ${response.status}`);
      }

      // 更新進度
      const percent = ((chunkIndex + 1) / totalChunks) * 100;
      let progressbar = file.htmlRow.getElementsByTagName("progress");
      if (progressbar[0]) {
        progressbar[0].value = percent;
      }
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${percent.toFixed(1)}%)`);
    }

    // 完成
    pendingFiles -= 1;
    if (pendingFiles === 0) {
      if (formatSelected) {
        convertButton.disabled = false;
      }
      convertButton.value = getTranslation("convert", "convertButton");
    }

    // Remove the progress bar
    let progressbar = file.htmlRow.getElementsByTagName("progress");
    if (progressbar[0]) {
      progressbar[0].parentElement.remove();
    }
    console.log("Chunked upload complete:", file.name);

  } catch (error) {
    console.error("Chunked upload failed:", error);
    pendingFiles -= 1;
    if (pendingFiles === 0) {
      convertButton.value = getTranslation("convert", "convertButton");
    }
  }
};

const formConvert = document.querySelector(`form[action='${webroot}/convert']`);

formConvert.addEventListener("submit", () => {
  const hiddenInput = document.querySelector("input[name='file_names']");
  hiddenInput.value = JSON.stringify(fileNames);
});

updateSearchBar();
