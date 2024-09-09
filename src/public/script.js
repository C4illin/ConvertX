// Select the file input element
const fileInput = document.querySelector('input[type="file"]');
const dropZone = document.getElementById("dropzone");
const fileNames = [];
let fileType;

dropZone.addEventListener("dragover", (e) => {
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
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
        showMatching("");
      };
    }

    convertToGroups[groupName] = [targets, groupElement];
  }

  convertToInput.addEventListener("input", (e) => {
    showMatching(e.target.value.toLowerCase());
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

// const convertFromSelect = document.querySelector("select[name='convert_from']");

// Add a 'change' event listener to the file input element
fileInput.addEventListener("change", (e) => {
  // console.log(e.target.files);
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
      <td>${(file.size / 1024).toFixed(2)} kB</td>
      <td><a class="secondary" onclick="deleteRow(this)" style="cursor: pointer">Remove</a></td>
    `;

    if (!fileType) {
      fileType = file.name.split(".").pop();
      console.log("fileType", fileType);
      fileInput.setAttribute("accept", `.${fileType}`);
      setTitle();

      // choose the option that matches the file type
      // for (const option of convertFromSelect.children) {
      //   console.log(option.value);
      //   if (option.value === fileType) {
      //     option.selected = true;
      //   }
      // }

      fetch("/conversions", {
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
const deleteRow = (target) => {
  const filename = target.parentElement.parentElement.children[0].textContent;
  const row = target.parentElement.parentElement;
  row.remove();

  // remove from fileNames
  const index = fileNames.indexOf(filename);
  fileNames.splice(index, 1);

  // if fileNames is empty, reset fileType
  if (fileNames.length === 0) {
    fileType = null;
    fileInput.removeAttribute("accept");
    setTitle();
  }

  fetch("/delete", {
    method: "POST",
    body: JSON.stringify({ filename: filename }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const uploadFiles = (files) => {
  const formData = new FormData();

  for (const file of files) {
    formData.append("file", file, file.name);
  }

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    })
    .catch((err) => console.log(err));
};

const formConvert = document.querySelector("form[action='/convert']");

formConvert.addEventListener("submit", (e) => {
  const hiddenInput = document.querySelector("input[name='file_names']");
  hiddenInput.value = JSON.stringify(fileNames);
});

updateSearchBar();
