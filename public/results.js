// public/results.js
//
// Handles live progress updates for /results/:jobId and Share via Erugo modal actions.
// IMPORTANT: /progress/:jobId re-renders the <main> content, so we must not keep stale
// element references. Use event delegation + (re)query elements when needed.

(function () {
  const webrootMeta = document.querySelector("meta[name='webroot']");
  const webroot = webrootMeta ? webrootMeta.content : "";
  const jobId = window.location.pathname.split("/").pop();
  const main = document.querySelector("main");

  // -----------------------------
  // Progress refresh
  // -----------------------------
  async function refreshData() {
    if (!main || !jobId) return;

    const progressElem = main.querySelector("progress");
    if (!progressElem) return;

    const max = Number(progressElem.getAttribute("max") || "0");
    const val = Number(progressElem.getAttribute("value") || "0");

    // Only refresh while still processing
    if (max > 0 && val >= max) return;

    try {
      const res = await fetch(`${webroot}/progress/${jobId}`, { method: "POST", cache: "no-store" });
      const html = await res.text();
      main.innerHTML = html;
    } catch (err) {
      console.error("[ConvertX] progress refresh failed", err);
    }
  }

  // Poll every second while job is running
  setInterval(refreshData, 1000);
  // Run once immediately so the page updates without waiting 1s.
  refreshData();

  // -----------------------------
  // Share modal helpers
  // -----------------------------
  function getEls() {
    return {
      modal: document.getElementById("cxShareModal"),
      closeBtn: document.getElementById("cxShareClose"),
      cancelBtn: document.getElementById("cxShareCancel"),
      submitBtn: document.getElementById("cxShareSubmit"),
      statusEl: document.getElementById("cxShareStatus"),

      emailEl: document.getElementById("cxShareEmail"),
      nameEl: document.getElementById("cxShareName"),
      descEl: document.getElementById("cxShareDescription"),

      linkBlock: document.getElementById("cxShareLinkBlock"),
      linkEl: document.getElementById("cxShareLink"),
      copyBtn: document.getElementById("cxShareCopy"),
    };
  }

  let currentJobId = null;
  let currentFileName = null;

  function openModal(jobIdValue, fileNameValue) {
    const els = getEls();
    if (!els.modal) return;

    currentJobId = jobIdValue;
    currentFileName = fileNameValue;

    if (els.nameEl) els.nameEl.value = fileNameValue || "";
    if (els.emailEl) els.emailEl.value = "";
    if (els.descEl) els.descEl.value = "";

    if (els.linkBlock) els.linkBlock.classList.add("hidden");
    if (els.linkEl) els.linkEl.value = "";
    if (els.statusEl) els.statusEl.textContent = "";

    els.modal.classList.remove("hidden");
    els.modal.classList.add("flex");

    if (els.emailEl) els.emailEl.focus();
  }

  function closeModal() {
    const els = getEls();
    if (!els.modal) return;

    els.modal.classList.add("hidden");
    els.modal.classList.remove("flex");

    currentJobId = null;
    currentFileName = null;
  }

  async function shareFile(jobIdValue, fileNameValue) {
    const els = getEls();
    if (!els.submitBtn || !els.statusEl) return;

    const recipientEmail = (els.emailEl && els.emailEl.value ? els.emailEl.value.trim() : "") || undefined;
    const shareName = (els.nameEl && els.nameEl.value ? els.nameEl.value.trim() : "") || undefined;
    const description = (els.descEl && els.descEl.value ? els.descEl.value.trim() : "") || undefined;

    els.submitBtn.disabled = true;
    els.submitBtn.setAttribute("aria-busy", "true");
    els.statusEl.textContent = "Sending...";

    try {
      const payload = { fileName: fileNameValue, recipientEmail, shareName, description };

      const res = await fetch(`${webroot}/share-to-erugo/${jobIdValue}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        console.error("[ConvertX] share-to-erugo failed", res.status, json);
        els.statusEl.textContent = "Failed. See logs.";
        return;
      }

      const url =
        (json && (json.share_url || json.share_link)) ||
        (json && json.data && json.data.url) ||
        (json && json.data && json.data.share && json.data.share.url) ||
        null;

      if (url && els.linkEl && els.linkBlock) {
        els.linkEl.value = url;
        els.linkBlock.classList.remove("hidden");
      }

      if (recipientEmail) {
        els.statusEl.textContent = url ? "Sent. Link also shown below." : "Sent.";
      } else {
        els.statusEl.textContent = url ? "Created. Copy the link below." : "Created.";
      }
    } catch (err) {
      console.error(err);
      els.statusEl.textContent = "Failed. See logs.";
    } finally {
      els.submitBtn.disabled = false;
      els.submitBtn.removeAttribute("aria-busy");
    }
  }

  // -----------------------------
  // Global event handlers (delegated)
  // -----------------------------
  document.addEventListener("click", async (event) => {
    const target = event.target;

    // Share icon buttons inside the table
    const shareBtn = target && target.closest ? target.closest("button[data-share='true']") : null;
    if (shareBtn) {
      const jobIdAttr = shareBtn.getAttribute("data-job-id");
      const fileNameAttr = shareBtn.getAttribute("data-file-name");
      if (!jobIdAttr || !fileNameAttr) return;
      openModal(jobIdAttr, fileNameAttr);
      return;
    }

    // Modal close/cancel
    if (target && target.id === "cxShareClose") {
      closeModal();
      return;
    }
    if (target && target.id === "cxShareCancel") {
      closeModal();
      return;
    }

    // Click outside modal (on overlay)
    const els = getEls();
    if (els.modal && target === els.modal) {
      closeModal();
      return;
    }

    // Submit
    if (target && target.id === "cxShareSubmit") {
      if (!currentJobId || !currentFileName) return;
      await shareFile(currentJobId, currentFileName);
      return;
    }

    // Copy
    if (target && target.id === "cxShareCopy") {
      const e = getEls();
      if (!e.linkEl || !e.statusEl) return;
      try {
        await navigator.clipboard.writeText(e.linkEl.value);
        e.statusEl.textContent = "Copied.";
      } catch {
        e.linkEl.focus();
        e.linkEl.select();
        e.statusEl.textContent = "Select + copy (Ctrl/Cmd+C).";
      }
      return;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const els = getEls();
    if (els.modal && !els.modal.classList.contains("hidden")) {
      closeModal();
    }
  });
})();

