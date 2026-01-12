// @ts-nocheck

import { Elysia, t } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { ALLOW_UNAUTHENTICATED, WEBROOT } from "../helpers/env";
import { DownloadIcon } from "../icons/download";
import { DeleteIcon } from "../icons/delete";
import { EyeIcon } from "../icons/eye";
import { ShareIcon } from "../icons/share";
import { userService } from "./user";
import { outputDir } from "..";
import { sendFileToErugo } from "../helpers/erugo";

function ResultsArticle({
  job,
  files,
  outputPath,
}: {
  job: Jobs;
  files: Filename[];
  outputPath: string;
}) {
  const maxFiles = Number((job as any).num_files ?? 0);
  const doneFiles = Number(files.filter((f: any) => String((f as any).status || '').toLowerCase() === 'done').length);
const isDone = doneFiles === maxFiles;

  const disabledLinkClass = "pointer-events-none opacity-50";
  const busyAttrs = { disabled: true, "aria-busy": "true" } as const;

  return (
    <article class="article">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl">Results</h1>

        <div class="flex flex-row gap-4">
          <a
            class={`flex btn-secondary flex-row gap-2 text-contrast ${
              !isDone ? disabledLinkClass : ""
            }`}
            href={`${WEBROOT}/delete/${job.id}`}
            {...(!isDone ? busyAttrs : {})}
          >
            <DeleteIcon /> <p>Delete</p>
          </a>

          <a
            class={`flex btn-primary flex-row gap-2 text-contrast ${
              !isDone ? disabledLinkClass : ""
            }`}
            href={`${WEBROOT}/archive/${job.id}`}
            download={`converted_files_${job.id}.tar`}
            {...(!isDone ? busyAttrs : {})}
          >
            <DownloadIcon /> <p>Tar</p>
          </a>

          <button
            id="cxDownloadAll"
            type="button"
            class="flex btn-primary flex-row gap-2 text-contrast"
            {...(!isDone ? busyAttrs : {})}
          >
            <DownloadIcon /> <p>All</p>
          </button>
        </div>
      </div>

      <progress
        max={maxFiles}
        value={doneFiles}
        class={`
          mb-4 inline-block h-2 w-full appearance-none overflow-hidden rounded-full border-0
          bg-neutral-700 bg-none text-accent-500 accent-accent-500
          [&::-moz-progress-bar]:bg-accent-500 [&::-webkit-progress-value]:rounded-full
          [&::-webkit-progress-value]:[background:none]
          [&[value]::-webkit-progress-value]:bg-accent-500
          [&[value]::-webkit-progress-value]:transition-[inline-size]
        `}
      />

      <table
        class={`
          w-full table-auto rounded bg-neutral-900 text-left
          [&_td]:p-4
          [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
        `}
      >
        <thead>
          <tr>
            <th class="px-2 py-2 sm:px-4">Converted File Name</th>
            <th class="px-2 py-2 sm:px-4">Status</th>
            <th class="px-2 py-2 sm:px-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {files.map((file) => (
            <tr key={file.output_file_name}>
              <td safe class="max-w-[20vw] truncate">
                {file.output_file_name}
              </td>
              <td safe>{file.status}</td>

              <td class="flex flex-row gap-4">
                <a
                  class="text-accent-500 hover:text-accent-400"
                  href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                >
                  <EyeIcon />
                </a>

                <a
                  class="text-accent-500 hover:text-accent-400"
                  href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                  download={file.output_file_name}
                >
                  <DownloadIcon />
                </a>

                <button
                  type="button"
                  class="text-accent-500 hover:text-accent-400"
                  data-share="true"
                  data-job-id={String(job.id)}
                  data-file-name={file.output_file_name}
                  aria-label="Share via Erugo"
                >
                  <ShareIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Share Modal (hidden by default) */}
      <div
        id="cxShareModal"
        class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60"
      >
        <div
          class="w-[92vw] max-w-[560px] rounded-lg border border-neutral-700 bg-neutral-900 p-4 text-neutral-100 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cxShareModalTitle"
        >
          <div class="mb-3 flex items-center justify-between">
            <h2 id="cxShareModalTitle" class="text-lg font-semibold">
              Share via Erugo
            </h2>

            <button
              type="button"
              id="cxShareClose"
              class="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-sm text-neutral-300">
                Recipient Email
              </label>
              <input
                id="cxShareEmail"
                type="email"
                class="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-accent-500"
                placeholder="name@example.com"
              />
              <p class="mt-1 text-xs text-neutral-400">
                If provided, Erugo will send the share link via email.
              </p>
            </div>

            <div>
              <label class="mb-1 block text-sm text-neutral-300">
                Share Name
              </label>
              <input
                id="cxShareName"
                type="text"
                class="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-accent-500"
                placeholder="My converted file"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm text-neutral-300">
                Description (optional)
              </label>
              <textarea
                id="cxShareDescription"
                class="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-accent-500"
                rows={3}
                placeholder="Message to share recipients (optional)"
              ></textarea>
            </div>

            <div class="flex items-center gap-2">
              <button
                id="cxShareSubmit"
                type="button"
                class="btn-primary flex items-center gap-2"
              >
                Send
              </button>

              <button id="cxShareCancel" type="button" class="btn-secondary">
                Cancel
              </button>

              <span id="cxShareStatus" class="text-sm text-neutral-300"></span>
            </div>

            <div id="cxShareLinkBlock" class="hidden">
              <label class="mb-1 block text-sm text-neutral-300">
                Share Link
              </label>
              <div class="flex gap-2">
                <input
                  id="cxShareLink"
                  type="text"
                  readonly
                  class="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
                />
                <button id="cxShareCopy" type="button" class="btn-secondary">
                  Copy
                </button>
              </div>
              <p class="mt-1 text-xs text-neutral-400">
                You can copy the link even if you also email it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * IMPORTANT FIX:
 * Results HTML is re-rendered via /progress/:jobId and replaces the article + modal.
 * So we MUST NOT keep stale DOM references. We re-query elements on each action.
 */
const shareJs = `
(function () {
  const WEBROOT = ${JSON.stringify(WEBROOT)};

  function getEl(id) { return document.getElementById(id); }

  function getRefs() {
    return {
      modal: getEl("cxShareModal"),
      closeBtn: getEl("cxShareClose"),
      cancelBtn: getEl("cxShareCancel"),
      submitBtn: getEl("cxShareSubmit"),
      statusEl: getEl("cxShareStatus"),
      emailEl: getEl("cxShareEmail"),
      nameEl: getEl("cxShareName"),
      descEl: getEl("cxShareDescription"),
      linkBlock: getEl("cxShareLinkBlock"),
      linkEl: getEl("cxShareLink"),
      copyBtn: getEl("cxShareCopy"),
    };
  }

  let currentJobId = null;
  let currentFileName = null;

  function openModal(jobId, fileName) {
    const r = getRefs();
    if (!r.modal || !r.emailEl || !r.nameEl || !r.descEl || !r.statusEl || !r.linkBlock || !r.linkEl) {
      console.warn("[ConvertX] Share modal elements not found (DOM may be mid-refresh).");
      return;
    }

    currentJobId = jobId;
    currentFileName = fileName;

    r.nameEl.value = fileName || "";
    r.emailEl.value = "";
    r.descEl.value = "";

    r.linkBlock.classList.add("hidden");
    r.linkEl.value = "";
    r.statusEl.textContent = "";

    r.modal.classList.remove("hidden");
    r.modal.classList.add("flex");
    r.emailEl.focus();
  }

  function closeModal() {
    const r = getRefs();
    if (!r.modal) return;

    r.modal.classList.add("hidden");
    r.modal.classList.remove("flex");
    currentJobId = null;
    currentFileName = null;
  }

  // Delegated: always works even after /progress replaces the article
  document.addEventListener("click", (e) => {
    const t = e.target;
    const btn = t && (t.closest ? t.closest('[data-share="true"]') : null);
    if (!btn) return;

    // kill old handlers (e.g. alert() from older results.js)
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    const jobId = btn.getAttribute("data-job-id");
    const fileName = btn.getAttribute("data-file-name");
    openModal(jobId, fileName);
  }, true);

  // Delegated close (because modal DOM is replaced during progress polling)
  document.addEventListener("click", (e) => {
    const id = e.target && e.target.id;
    if (id === "cxShareClose" || id === "cxShareCancel") {
      e.preventDefault();
      closeModal();
    }
    if (id === "cxShareModal") {
      // click outside dialog closes
      closeModal();
    }
  }, true);

  document.addEventListener("keydown", (e) => {
    const r = getRefs();
    if (e.key === "Escape" && r.modal && !r.modal.classList.contains("hidden")) closeModal();
  });

  // Delegated copy
  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (!t || t.id !== "cxShareCopy") return;
    e.preventDefault();

    const r = getRefs();
    if (!r.linkEl || !r.statusEl) return;

    try {
      await navigator.clipboard.writeText(r.linkEl.value || "");
      r.statusEl.textContent = "Copied.";
    } catch (err) {
      r.linkEl.focus();
      r.linkEl.select();
      r.statusEl.textContent = "Select + copy (Ctrl/Cmd+C).";
    }
  }, true);

  // Delegated submit
  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (!t || t.id !== "cxShareSubmit") return;
    e.preventDefault();

    const r = getRefs();
    if (!r.submitBtn || !r.statusEl || !r.emailEl || !r.nameEl || !r.descEl || !r.linkBlock || !r.linkEl) return;

    if (!currentJobId || !currentFileName) return;

    r.submitBtn.disabled = true;
    r.submitBtn.setAttribute("aria-busy", "true");
    r.statusEl.textContent = "Sending...";

    try {
      const email = (r.emailEl.value || "").trim();
      const shareName = (r.nameEl.value || "").trim();
      const description = (r.descEl.value || "").trim();

      const payload = {
        fileName: currentFileName,
        ...(email ? { recipientEmail: email } : {}),
        ...(shareName ? { shareName } : {}),
        ...(description ? { description } : {}),
      };

      const res = await fetch(\`\${WEBROOT}/share-to-erugo/\${currentJobId}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (_) { json = { raw: text }; }

      if (!res.ok) {
        console.error("[ConvertX] share-to-erugo error", res.status, json);
        r.statusEl.textContent = "Failed. See logs.";
        return;
      }

      const url =
        json?.share_url ||
        json?.share_link ||
        json?.data?.url ||
        json?.data?.share?.url ||
        null;

      if (url) {
        r.linkEl.value = url;
        r.linkBlock.classList.remove("hidden");
      }

      r.statusEl.textContent = email
        ? (url ? "Sent. Link also shown below." : "Sent. (No link returned.)")
        : (url ? "Created. Copy the link below." : "Created, but no link returned.");
    } catch (err) {
      console.error(err);
      r.statusEl.textContent = "Failed. See logs.";
    } finally {
      r.submitBtn.disabled = false;
      r.submitBtn.removeAttribute("aria-busy");
    }
  }, true);

  // Download All: delegated, because button is replaced during progress polling
  document.addEventListener("click", (e) => {
    const t = e.target;
    const btn = t && (t.closest ? t.closest("#cxDownloadAll") : null);
    if (!btn) return;

    e.preventDefault();
    try {
      if (typeof window.downloadAll === "function") {
        window.downloadAll();
      } else {
        console.warn("[ConvertX] downloadAll() not found. Ensure results.js is loaded.");
      }
    } catch (err) {
      console.error("[ConvertX] downloadAll() failed", err);
    }
  }, true);
})();
`.trim();

export const results = new Elysia()
  .use(userService)

  .get(
    "/results-share.js",
    () =>
      new Response(shareJs, {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
        },
      }),
    { auth: true },
  )

  .get(
    "/results/:jobId",
    async ({ params, set, cookie: { job_id }, user }) => {
      if (job_id?.value) job_id.remove();

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { message: "Job not found." };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return (
        <BaseHtml webroot={WEBROOT} title="ConvertX | Result">
          <>
            <Header
              webroot={WEBROOT}
              allowUnauthenticated={ALLOW_UNAUTHENTICATED}
              loggedIn
            />

            <main class="w-full flex-1 px-2 sm:px-4">
              <ResultsArticle job={job} files={files} outputPath={outputPath} />
            </main>

            {/* keep existing file */}
            <script src={`${WEBROOT}/results.js`} defer />

            {/* our override must also load */}
            <script src={`${WEBROOT}/results-share.js`} defer />
          </>
        </BaseHtml>
      );
    },
    { auth: true },
  )

  .post(
    "/progress/:jobId",
    async ({ set, params, cookie: { job_id }, user }) => {
      if (job_id?.value) job_id.remove();

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { message: "Job not found." };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return <ResultsArticle job={job} files={files} outputPath={outputPath} />;
    },
    { auth: true },
  )

  .post(
    "/share-to-erugo/:jobId",
    async ({ params, body, user, set }) => {
      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { message: "Job not found." };
      }

      const file = db
        .query(
          "SELECT * FROM file_names WHERE job_id = ? AND output_file_name = ?",
        )
        .as(Filename)
        .get(params.jobId, body.fileName);

      if (!file) {
        set.status = 404;
        return { message: "File not found." };
      }

      const fullPath = `${outputDir}${user.id}/${params.jobId}/${file.output_file_name}`;

      try {
        const payload = {
          fullPath,
          filename: file.output_file_name,
          shareName: body.shareName?.trim() || file.output_file_name,
          ...(body.description?.trim()
            ? { description: body.description.trim() }
            : {}),
          ...(body.recipientEmail?.trim()
            ? { recipientEmail: body.recipientEmail.trim() }
            : {}),
        };

        const result = await sendFileToErugo(payload);
        return result;
      } catch (err: any) {
        console.error(err);
        set.status = 500;
        return { message: "Failed to share with Erugo" };
      }
    },
    {
      auth: true,
      body: t.Object({
        fileName: t.String(),
        recipientEmail: t.Optional(t.String()),
        shareName: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  );


