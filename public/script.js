const webroot = document.querySelector("meta[name='webroot']").content;
const fileInput = document.querySelector('input[type="file"]');
const dropZone = document.getElementById("dropzone");
const convertButton = document.querySelector("input[type='submit']");
const fileNames = [];
let fileType;
let pendingFiles = 0;
let formatSelected = false;

dropZone.addEventListener("dragover", () => {
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", () => {
  dropZone.classList.remove("dragover");
});

const selectContainer = document.querySelector("form .select_container");

const updateSearchBar = () => {
  const convertToInput = document.querySelector(
    "input[name='convert_to_search']",
  );
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
  // Get the selected files from the event target
  const files = e.target.files;

  // Select the file-list table
  const fileList = document.querySelector("#file-list");

  // Loop through the selected files
  for (const file of files) {
    // Create a new table row for each file
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${file.name}</td>
      <td><progress max="100"></progress></td>
      <td>${(file.size / 1024).toFixed(2)} kB</td>
      <td><a onclick="deleteRow(this)">Remove</a></td>
    `;

    if (!fileType) {
      fileType = file.name.split(".").pop();
      fileInput.setAttribute("accept", `.${fileType}`);
      setTitle();

      // choose the option that matches the file type
      // for (const option of convertFromSelect.children) {
      //   console.log(option.value);
      //   if (option.value === fileType) {
      //     option.selected = true;
      //   }
      // }

      fetch(`${webroot}/conversions`, {
        method: "POST",
        body: JSON.stringify({ fileType: fileType }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.text())
        .then((html) => {
          selectContainer.innerHTML = html;
          updateSearchBar();
        })
        .catch((err) => console.log(err));
    }

    // Append the row to the file-list table
    fileList.appendChild(row);

    //Imbed row into the file to reference later
    file.htmlRow = row;


    // Append the file to the hidden input
    fileNames.push(file.name);
  }

  uploadFiles(files);
});

const setTitle = () => {
  const title = document.querySelector("h1");
  title.textContent = `Convert ${fileType ? `.${fileType}` : ""}`;
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
  })
    .catch((err) => console.log(err));
};

const uploadFiles = (files) => {
  convertButton.disabled = true;
  convertButton.textContent = "Uploading...";
  pendingFiles += 1;

  const formData = new FormData();

  for (const file of files) {
    formData.append("file", file, file.name);
  }

  let xhr = new XMLHttpRequest(); 

  xhr.open("POST", `${webroot}/upload`, true);

  xhr.onload = (e) => {
    let data = JSON.parse(xhr.responseText);

    pendingFiles -= 1;
    if (pendingFiles === 0) {
      if (formatSelected) {
        convertButton.disabled = false;
      }
      convertButton.textContent = "Convert";
    }

    //Remove the progress bar when upload is done
    for (const file of files) {
      let progressbar = file.htmlRow.getElementsByTagName("progress");
      progressbar[0].parentElement.remove();
    }
    console.log(data);
  };

  xhr.upload.onprogress = (e) => {
      //All files upload together are binded by the same progress. The loop should probably be on the call to this function to track each upload individually.
      let sent = e.loaded;
      let total = e.total;
      console.log("upload progress:", (100 * sent) / total);

      for (const file of files) {
        let progressbar = file.htmlRow.getElementsByTagName("progress");
        progressbar[0].value = ((100 * sent) / total);
      }
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
