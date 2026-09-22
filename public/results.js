const webroot = document.querySelector("meta[name='webroot']").content;
const jobId = window.location.pathname.split("/").pop();
const main = document.querySelector("main");
let progressElem = document.querySelector("progress");

const supportsWebShare = navigator.share && navigator.canShare;

const setupShareButtons = () => {
  if (!supportsWebShare) {
    return;
  }

  document.querySelectorAll(".share-btn").forEach((btn) => {
    if (btn.dataset.setupComplete) return;

    const filename = btn.dataset.filename;
    const mimeType = btn.dataset.mimeType;
    const fileUrl = btn.dataset.downloadUrl;
    const dummyFile = new File([], filename, { type: mimeType });

    if (!navigator.canShare({ files: [dummyFile] })) {
      return;
    }
    let cachedFile = null;
    let isFetching = false;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (isFetching) return;
      try {
        if (!cachedFile) {
          isFetching = true;
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to download file (${response.status})`);
          }
          const blob = await response.blob();
          cachedFile = new File([blob], filename, { type: mimeType });
        }
        await navigator.share({ files: [cachedFile] });
      } catch (err) {
        if (err.name === "NotAllowedError" && cachedFile) {
          alert("File is ready. Please tap the share button again to share.");
        } else if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      } finally {
        isFetching = false;
      }
    });
    btn.style.display = "";
    btn.dataset.setupComplete = true;
  });
};

const refreshData = () => {
  // console.log("Refreshing data...", progressElem.value, progressElem.max);
  if (progressElem.value !== progressElem.max) {
    fetch(`${webroot}/progress/${jobId}`, {
      method: "POST",
    })
      .then((res) => res.text())
      .then((html) => {
        main.innerHTML = html;
        setupShareButtons();
      })
      .catch((err) => console.log(err));

    setTimeout(refreshData, 1000);
  }

  progressElem = document.querySelector("progress");
};

setupShareButtons();
refreshData();

window.downloadAll = function () {
  // Get all download links
  const downloadLinks = document.querySelectorAll("tbody a[download]");

  // Trigger download for each link
  downloadLinks.forEach((link, index) => {
    // We add a delay for each download to prevent them from starting at the same time
    setTimeout(() => {
      const event = new MouseEvent("click");
      link.dispatchEvent(event);
    }, index * 300);
  });
};
