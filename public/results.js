const webroot = document.querySelector("meta[name='webroot']").content;
const jobId = window.location.pathname.split("/").pop();
const main = document.querySelector("main");
let progressElem = document.querySelector("progress");

const refreshData = () => {
  // console.log("Refreshing data...", progressElem.value, progressElem.max);
  if (progressElem.value !== progressElem.max) {
    fetch(`${webroot}/progress/${jobId}`, {
      method: "POST",
    })
      .then((res) => res.text())
      .then((html) => {
        main.innerHTML = html;
      })
      .catch((err) => console.log(err));

    setTimeout(refreshData, 1000);
  }

  progressElem = document.querySelector("progress");
};

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
