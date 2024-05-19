// Select the file input element
const fileInput = document.querySelector('input[type="file"]');
const fileNames = [];
let fileType;

const selectElem = document.querySelector("select[name='convert_to']");

// Add a 'change' event listener to the file input element
fileInput.addEventListener("change", (e) => {
  console.log(e.target.files);
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
      <td>${(file.size / 1024 / 1024).toFixed(2)} MB</td>
      <td><button class="secondary" onclick="deleteRow(this)">x</button></td>
    `;

    if (!fileType) {
      fileType = file.name.split(".").pop();
      console.log(file.type);
      fileInput.setAttribute("accept", `.${fileType}`);

      const title = document.querySelector("h1");
      title.textContent = `Convert .${fileType}`;

      fetch("/conversions", {
        method: "POST",
        body: JSON.stringify({ fileType: fileType }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.text()) // Convert the response to text
        .then((html) => {
          console.log(html);
          selectElem.outerHTML = html; // Set the HTML
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

// Add a onclick for the delete button
const deleteRow = (target) => {
  const filename = target.parentElement.parentElement.children[0].textContent;
  const row = target.parentElement.parentElement;
  row.remove();

  // remove from fileNames
  const index = fileNames.indexOf(filename);
  fileNames.splice(index, 1);

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
