// Clientside application logic — migrated from script.js with full TypeScript types.
// Uses @elysiajs/eden for type-safe API calls instead of raw fetch().

import { edenFetch } from "@elysiajs/eden";

import type { App } from "../src";
import { findPresetTarget } from "../src/helpers/findPresetTarget";

// ── State ──────────────────────────────────────────────────────────────────────
let fileType: string | null = null;
const fileNames: string[] = [];
let pendingFiles = 0;
let formatSelected = false;

const urlParams = new URLSearchParams(window.location.search);
const defaultTo = urlParams.get("to");
const defaultConverter = urlParams.get("converter");

// ── DOM refs (guarded by type assertions) ──────────────────────────────────────
const webroot = document.querySelector<HTMLMetaElement>("meta[name='webroot']")!.content;
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
const dropZone = document.getElementById("dropzone") as HTMLDivElement;
const convertButton = document.querySelector<HTMLInputElement>("input[type='submit']")!;
const selectContainer = document.querySelector<HTMLDivElement>("form .select_container")!;
const formConvert = document.querySelector<HTMLFormElement>(`form[action='${webroot}/convert']`)!;

// ── Typed Eden client ──────────────────────────────────────────────────────────
// Created from the app type, not at runtime — elysia is stripped by `bun build -e elysia`.
const api = edenFetch<App>(webroot);

// ── Route helpers (typed via @elysiajs/eden inference from App) ────────────────
async function postConversions(body: { fileType: string }): Promise<string> {
  const res = await api("/conversions", { method: "POST", body, headers: {} });
  if (res.error) throw new Error(`POST /conversions failed: ${JSON.stringify(res.error)}`);
  return res.data;
}

async function postDelete(body: { filename: string }): Promise<unknown> {
  const res = await api("/delete", { method: "POST", body, headers: {} });
  if (res.error) throw new Error(`POST /delete failed: ${JSON.stringify(res.error)}`);
  return res.data;
}

// ── Drag-and-drop ──────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", (e: DragEvent) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (e: DragEvent) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = e.dataTransfer?.files ?? new DataTransfer().files;

  if (files.length === 0) {
    console.warn("No files dropped — likely a URL or unsupported source.");
    return;
  }

  for (const file of Array.from(files)) {
    console.log("Handling dropped file:", file.name);
    handleFile(file);
  }
});

// ── File handling ──────────────────────────────────────────────────────────────
interface ExtendedFile extends File {
  htmlRow: HTMLTableRowElement;
}

function createFileRow(file: File): HTMLTableRowElement {
  const row = document.createElement("tr");

  // Filename cell (text only, no HTML injection)
  const nameCell = document.createElement("td");
  nameCell.textContent = file.name;

  // Progress cell
  const progressCell = document.createElement("td");
  const progress = document.createElement("progress");
  progress.setAttribute("max", "100");
  progress.className =
    "inline-block h-2 appearance-none overflow-hidden rounded-full border-0 " +
    "bg-neutral-700 bg-none text-accent-500 accent-accent-500";
  progressCell.appendChild(progress);

  // Size cell
  const sizeCell = document.createElement("td");
  sizeCell.textContent = `${(file.size / 1024).toFixed(2)} kB`;

  // Remove button cell
  const removeCell = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "text-accent-500 hover:underline";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => deleteRow(removeBtn));
  removeCell.appendChild(removeBtn);

  row.appendChild(nameCell);
  row.appendChild(progressCell);
  row.appendChild(sizeCell);
  row.appendChild(removeCell);

  return row;
}

function handleFile(file: File): void {
  const fileList = document.querySelector<HTMLTableElement>("#file-list")!;

  const row = createFileRow(file);

  if (!fileType) {
    const extension = file.name.split(".").pop() ?? "";
    fileType = extension;
    fileInput.setAttribute("accept", `.${fileType}`);
    setTitle();

    postConversions({ fileType: extension })
      .then((html) => {
        // SECURE: server-rendered HTML fragment from trusted /conversions endpoint (no user input)
        selectContainer.innerHTML = html;
        updateSearchBar();
        applyPresetTarget();
      })
      .catch(console.error);
  }

  fileList.appendChild(row);
  (file as ExtendedFile).htmlRow = row;
  fileNames.push(file.name);
  uploadFile(file);
}

// ── Search / format selection ──────────────────────────────────────────────────
const updateSearchBar = (): void => {
  const convertToInput = document.querySelector<HTMLInputElement>(
    "input[name='convert_to_search']",
  )!;
  const convertToPopup = document.querySelector<HTMLDivElement>(".convert_to_popup")!;
  const convertToGroupElements = document.querySelectorAll<HTMLElement>(".convert_to_group");
  const convertToGroups: Record<string, [HTMLElement[], HTMLElement]> = {};
  const convertToElement = document.querySelector<HTMLSelectElement>("select[name='convert_to']")!;

  const showMatching = (search: string): void => {
    for (const [, groupElement] of Object.values(convertToGroups)) {
      let matchingTargetsFound = 0;
      for (const target of convertToGroups[groupElement.dataset.converter ?? ""]?.[0] ?? []) {
        if (target.dataset.target?.includes(search)) {
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

  for (const groupElement of Array.from(convertToGroupElements)) {
    const groupName = groupElement.dataset.converter ?? "";

    const targets: HTMLElement[] = Array.from(
      groupElement.querySelectorAll<HTMLElement>(".target"),
    );

    for (const target of targets) {
      // Keep focus in the search input so the popup does not close before the click lands.
      target.addEventListener("mousedown", (e: MouseEvent) => e.preventDefault());
      target.addEventListener("click", () => {
        if (target.dataset.value && convertToElement) {
          convertToElement.value = target.dataset.value;
        }
        convertToInput.value = `${target.dataset.target ?? ""} using ${target.dataset.converter ?? ""}`;
        formatSelected = true;
        if (pendingFiles === 0 && fileNames.length > 0) {
          convertButton.disabled = false;
        }
        showMatching("");
      });
    }

    convertToGroups[groupName] = [targets, groupElement];
  }

  convertToInput.addEventListener("input", (e: Event) => {
    showMatching((e.target as HTMLInputElement).value.toLowerCase());
  });

  convertToInput.addEventListener("search", () => {
    // when the user clears the search bar using the 'x' button
    convertButton.disabled = true;
    formatSelected = false;
  });

  convertToInput.addEventListener("blur", (e: FocusEvent) => {
    // Keep the popup open even when clicking on a target button
    // for a split second to allow the click to go through
    if ((e.relatedTarget as HTMLElement)?.classList?.contains("target")) {
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

// ── Pre-selection via ?to=<format>&converter=<name> ───────────────────────────
const applyPresetTarget = (): void => {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>(".target")).map((el) => ({
    target: el.dataset.target ?? "",
    converter: el.dataset.converter ?? "",
    value: el.dataset.value ?? "",
  }));
  const match = findPresetTarget(buttons, defaultTo, defaultConverter);
  if (!match) return;

  const convertToEl = document.querySelector<HTMLSelectElement>("select[name='convert_to']");
  const convertToInputEl = document.querySelector<HTMLInputElement>(
    "input[name='convert_to_search']",
  );
  if (!convertToEl || !convertToInputEl) return;

  convertToEl.value = match.value;
  convertToInputEl.value = `${match.target} using ${match.converter}`;
  formatSelected = true;
  if (pendingFiles === 0 && fileNames.length > 0) {
    convertButton.disabled = false;
  }
};

// ── File input change ──────────────────────────────────────────────────────────
fileInput.addEventListener("change", (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const file of Array.from(files)) {
    handleFile(file);
  }
});

// ── Page title ─────────────────────────────────────────────────────────────────
const setTitle = (): void => {
  const title = document.querySelector("h1");
  if (!title) return;
  title.textContent = `Convert ${fileType ? `.${fileType}` : ""}`;
};

// ── Row deletion ───────────────────────────────────────────────────────────────
const resetIfNoFiles = (): void => {
  if (fileNames.length > 0) return;
  fileType = null;
  formatSelected = false;
  fileInput.removeAttribute("accept");
  convertButton.disabled = true;
  setTitle();
};

const deleteRow = (target: HTMLElement): void => {
  const filename = target.parentElement?.parentElement?.children?.[0]?.textContent ?? "";
  const row = target.parentElement?.parentElement;
  row?.remove();

  // remove from fileNames
  const index = fileNames.indexOf(filename);
  if (index !== -1) {
    fileNames.splice(index, 1);
  }

  // reset fileInput
  fileInput.value = "";

  resetIfNoFiles();

  postDelete({ filename }).catch(console.log);
};

// ── File upload via XHR ───────────────────────────────────────────────────────
const finishUpload = (): void => {
  pendingFiles -= 1;
  if (pendingFiles > 0) return;
  if (formatSelected && fileNames.length > 0) {
    convertButton.disabled = false;
  }
  convertButton.value = "Convert";
};

// A file that never reached the server must not be submitted for conversion.
const failUpload = (file: File): void => {
  const row = (file as ExtendedFile).htmlRow;
  row?.remove();
  const index = fileNames.indexOf(file.name);
  if (index !== -1) {
    fileNames.splice(index, 1);
  }
  fileInput.value = "";
  finishUpload();
  resetIfNoFiles();
};

const uploadFile = (file: File): void => {
  convertButton.disabled = true;
  convertButton.value = "Uploading...";
  pendingFiles += 1;

  const formData = new FormData();
  formData.append("file", file, file.name);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${webroot}/upload`, true);

  xhr.onload = (): void => {
    if (xhr.status < 200 || xhr.status >= 300) {
      console.log(`Upload failed with status ${xhr.status}`);
      failUpload(file);
      return;
    }

    let data: { message?: string };
    try {
      data = JSON.parse(xhr.responseText);
    } catch {
      console.warn("Failed to parse upload response:", xhr.responseText);
      failUpload(file);
      return;
    }

    finishUpload();

    // Remove the progress bar when upload is done
    const progressbar = (file as ExtendedFile).htmlRow?.getElementsByTagName("progress");
    progressbar?.[0]?.parentElement?.remove();
    console.log(data);
  };

  xhr.upload.onprogress = (e: ProgressEvent): void => {
    const sent = e.loaded;
    const total = e.total;
    if (total > 0) {
      console.log(`upload progress (${file.name}):`, (100 * sent) / total);
    }

    const progressbar = (file as ExtendedFile).htmlRow?.getElementsByTagName("progress");
    if (progressbar?.[0]) {
      progressbar[0].value = total > 0 ? (100 * sent) / total : 0;
    }
  };

  xhr.onerror = (): void => {
    console.log("Upload failed");
    failUpload(file);
  };

  xhr.send(formData);
};

// ── Form submission ────────────────────────────────────────────────────────────
formConvert.addEventListener("submit", () => {
  const hiddenInput = document.querySelector<HTMLInputElement>("input[name='file_names']")!;
  hiddenInput.value = JSON.stringify(fileNames);
});

// ── Init ───────────────────────────────────────────────────────────────────────
updateSearchBar();
