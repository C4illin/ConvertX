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
