// History page logic: expandable job rows, bulk selection and bulk deletion.

import { edenFetch } from "@elysiajs/eden";

import type { App } from "../src";
import {
  arrowPath,
  deleteConfirmMessage,
  deleteResultMessage,
  selectionState,
} from "../src/helpers/historySelection";

const webroot = document.querySelector<HTMLMetaElement>("meta[name='webroot']")?.content ?? "";
const api = edenFetch<App>(webroot);

for (const toggle of document.querySelectorAll<HTMLElement>(".job-details-toggle")) {
  toggle.addEventListener("click", () => {
    const jobId = toggle.dataset.jobId;
    const detailsRow = document.getElementById(`details-${jobId}`);
    const arrow = document.getElementById(`arrow-${jobId}`);
    if (!detailsRow || !arrow) return;
    detailsRow.classList.toggle("hidden");
    // SECURE: static SVG markup, no user input
    arrow.innerHTML = arrowPath(detailsRow.classList.contains("hidden"));
  });
}

const selectAll = document.getElementById("select-all") as HTMLInputElement | null;
const jobCheckboxes = Array.from(
  document.querySelectorAll<HTMLInputElement>('[data-checkbox-type="job"]'),
);
const deleteButton = document.getElementById("delete-selected-btn") as HTMLButtonElement | null;
const selectedCount = document.getElementById("selected-count");

const updateDeleteButton = (): void => {
  const { count } = selectionState(jobCheckboxes.map((cb) => cb.checked));
  if (deleteButton) deleteButton.disabled = count === 0;
  if (selectedCount) selectedCount.textContent = String(count);
};

selectAll?.addEventListener("change", () => {
  for (const checkbox of jobCheckboxes) checkbox.checked = selectAll.checked;
  updateDeleteButton();
});

for (const checkbox of jobCheckboxes) {
  checkbox.addEventListener("change", () => {
    const { all, some } = selectionState(jobCheckboxes.map((cb) => cb.checked));
    if (selectAll) {
      selectAll.checked = all;
      selectAll.indeterminate = some;
    }
    updateDeleteButton();
  });
}

deleteButton?.addEventListener("click", async () => {
  const jobIds = jobCheckboxes.filter((cb) => cb.checked).map((cb) => cb.dataset.jobId ?? "");
  if (jobIds.length === 0) return;
  if (!confirm(deleteConfirmMessage(jobIds.length))) return;

  try {
    const res = await api("/delete-multiple", { method: "POST", body: { jobIds }, headers: {} });
    if (res.error || !res.data) throw new Error(`HTTP error! status: ${res.error?.status}`);
    const { message, reload } = deleteResultMessage(res.data);
    alert(message);
    if (reload) window.location.reload();
  } catch (error) {
    console.error("Error deleting jobs:", error);
    alert("An error occurred while deleting jobs. Please try again.");
  }
});
