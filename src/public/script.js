// Select the file input element
const fileInput = document.querySelector('input[type="file"]');

const filesToUpload = [];

// Add a 'change' event listener to the file input element
fileInput.addEventListener("change", (e) => {
	console.log(e.target.files);
	// Get the selected files from the event target
	const files = e.target.files;

	// Select the file-list table
	const fileList = document.querySelector("#file-list");

	// Loop through the selected files
	for (let i = 0; i < files.length; i++) {
		// Create a new table row for each file
		const row = document.createElement("tr");
		row.innerHTML = `
      <td>${files[i].name}</td>
      <td>${(files[i].size / 1024 / 1024).toFixed(2)} MB</td>
      <td><button class="secondary" onclick="deleteRow(this)">x</button></td>
    `;

		// Append the row to the file-list table
		fileList.appendChild(row);
	}

	uploadFiles(files);
});

// Add a onclick for the delete button
const deleteRow = (target) => {
	const fileName = target.parentElement.parentElement.children[0].textContent;
	const row = target.parentElement.parentElement;
	row.remove();
	
	fetch("/delete", {
		method: "POST",
		body: JSON.stringify({ fileName }),
	})
		.then((res) => res.json())
		.then((data) => {
			console.log(data);
		})
		.catch((err) => console.log(err));
};

const uploadFiles = (files) => {
	const formData = new FormData();

	for (let i = 0; i < files.length; i++) {
		formData.append("files", files[i], files[i].name);
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
