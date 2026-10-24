// Results page logic — monitors conversion progress via polling.
// Loaded as a <script> tag on the results page; uses no imports.

const webroot = document.querySelector<HTMLMetaElement>("meta[name='webroot']")!.content;
const jobId = window.location.pathname.split("/").pop();
const main = document.querySelector("main")!;
let progressElem = document.querySelector<HTMLProgressElement>("progress");

// ── Progress polling ───────────────────────────────────────────────────────────
function refreshData(): void {
  // console.log("Refreshing data...", progressElem?.value, progressElem?.max);
  if (progressElem && progressElem.value !== progressElem.max) {
    fetch(`${webroot}/progress/${jobId}`, { method: "POST" })
      .then((res) => res.text())
      .then((html) => {
        main.innerHTML = html;
      })
      .catch((err) => console.log(err));

    setTimeout(refreshData, 1000);
  }

  progressElem = document.querySelector<HTMLProgressElement>("progress");
}

refreshData();

// ── Global download-all handler ────────────────────────────────────────────────
declare global {
  interface Window {
    downloadAll: () => void;
  }
}

window.downloadAll = function (): void {
  // Get all download links
  const downloadLinks = document.querySelectorAll<HTMLAnchorElement>("tbody a[download]");

  // Trigger download for each link with staggered delays to prevent browser throttling
  downloadLinks.forEach((link, index) => {
    setTimeout(() => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
    }, index * 300);
  });
};
