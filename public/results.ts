// Results page logic — monitors conversion progress via polling.
// Loaded as a <script> tag on the results page.

import { edenFetch } from "@elysiajs/eden";

import type { App } from "../src";

const webroot = document.querySelector<HTMLMetaElement>("meta[name='webroot']")!.content;
const jobId = window.location.pathname.split("/").pop();
const main = document.querySelector("main")!;
const api = edenFetch<App>(webroot);
let progressElem = document.querySelector<HTMLProgressElement>("progress");

// ── Progress polling ───────────────────────────────────────────────────────────
function refreshData(): void {
  // console.log("Refreshing data...", progressElem?.value, progressElem?.max);
  if (progressElem && progressElem.value !== progressElem.max) {
    api("/progress/:jobId", {
      method: "POST",
      params: { jobId: jobId ?? "" },
      headers: {},
      body: {},
    })
      .then((res) => {
        if (res.error) throw new Error(`POST /progress failed: ${res.status}`);
        // SECURE: server-rendered HTML fragment from trusted /progress endpoint (no user input)
        main.innerHTML = res.data as unknown as string;
      })
      .catch((err) => console.log(err));

    setTimeout(refreshData, 1000);
  }

  progressElem = document.querySelector<HTMLProgressElement>("progress");
}

refreshData();

// ── Download-all handler (delegated: the article is re-rendered while polling) ─
document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest("[data-action='download-all']");
  if (!button) return;

  const downloadLinks = document.querySelectorAll<HTMLAnchorElement>("tbody a[download]");

  // Staggered delays prevent browser throttling
  downloadLinks.forEach((link, index) => {
    setTimeout(() => {
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }, index * 300);
  });
});
