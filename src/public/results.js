window.downloadAll = function () {
  // Get all download links
  const downloadLinks = document.querySelectorAll("a[download]");

  // Trigger download for each link
  downloadLinks.forEach((link, index) => {
    // We add a delay for each download to prevent them from starting at the same time
    setTimeout(() => {
      const event = new MouseEvent("click");
      link.dispatchEvent(event);
    }, index * 100);
  });
};
const jobId = window.location.pathname.split("/").pop();
const main = document.querySelector("main");
const progressElem = document.querySelector("progress");

const refreshData = () => {
  if (progressElem.value !== progressElem.max) {
    fetch(`/progress/${jobId}`, {
      method: "POST",
    })
      .then((res) => res.text())
      .then((html) => {
        main.innerHTML = html;
      })
      .catch((err) => console.log(err));

    setTimeout(refreshData, 1000);
  }
};

refreshData();
