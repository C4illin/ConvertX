// History page logic: expandable job rows, bulk selection and bulk deletion.

import { edenFetch } from "@elysiajs/eden";

import type { App } from "../src";
import {
  arrowPath,
  chunk,
  deleteConfirmMessage,
  deleteResultMessage,
  selectionState,
} from "../src/helpers/historySelection";

const webroot = document.querySelector<HTMLMetaElement>("meta[name='webroot']")?.content ?? "";
const api = edenFetch<App>(webroot);

// Mirrors the `maxItems` limit of POST /delete-multiple.
const DELETE_BATCH_SIZE = 100;

for (const toggle of Array.from(document.querySelectorAll<HTMLElement>(".job-details-toggle"))) {
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
    let deleted = 0;
    let failed = 0;
    let requestFailures = 0;
    for (const batch of chunk(jobIds, DELETE_BATCH_SIZE)) {
      const res = await api("/delete-multiple", {
        method: "POST",
        body: { jobIds: batch },
        headers: {},
      });
      if (res.error || !res.data) {
        requestFailures += 1;
        failed += batch.length;
        continue;
      }
      deleted += res.data.deleted ?? 0;
      failed += res.data.failed ?? 0;
    }
    if (deleted === 0 && requestFailures > 0) {
      throw new Error("All delete requests failed");
    }
    const { message, reload } = deleteResultMessage({ success: failed === 0, deleted, failed });
    alert(message);
    if (reload) window.location.reload();
  } catch (error) {
    console.error("Error deleting jobs:", error);
    alert("An error occurred while deleting jobs. Please try again.");
  }
});
