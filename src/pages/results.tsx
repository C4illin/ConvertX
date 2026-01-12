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

export const results = new Elysia()
  .use(userService)
  .get(
    "/results/:id",
    async ({ params: { id }, user }) => {
      if (!ALLOW_UNAUTHENTICATED && !user) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${WEBROOT}/login` },
        });
      }

      const job = db
        .query("SELECT * FROM jobs WHERE id = ?")
        .as(Jobs)
        .get(id);

      if (!job) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${WEBROOT}/history` },
        });
      }

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(id);

      if (!files) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${WEBROOT}/history` },
        });
      }

      const isOwner = user?.id === job.user_id;

      // If authentication is enabled, users should only be able to access their own jobs.
      // If authentication is disabled, anyone can access job links.
      if (!ALLOW_UNAUTHENTICATED && !isOwner) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${WEBROOT}/history` },
        });
      }

      return (
        <BaseHtml title="ConvertX | Results">
          <body>
            <Header user={user} />
            <main class="px-4 py-12">
              <div class="mx-auto max-w-6xl">
                <ResultsArticle job={job} files={files} />
              </div>
            </main>

            <script src={`${WEBROOT}/public/scripts/results.js`}></script>
          </body>
        </BaseHtml>
      );
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
  )
  .get(
    "/archive/:id",
    async ({ params: { id }, user, set }) => {
      if (!ALLOW_UNAUTHENTICATED && !user) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/login`;
        return;
      }

      const job = db.query("SELECT * FROM jobs WHERE id = ?").as(Jobs).get(id);

      if (!job) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const isOwner = user?.id === job.user_id;

      // If authentication is enabled, users should only be able to access their own jobs.
      // If authentication is disabled, anyone can access job links.
      if (!ALLOW_UNAUTHENTICATED && !isOwner) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const outputTar = Bun.file(`${outputDir}/${job.id}/converted_files_${job.id}.tar`);

      if (!(await outputTar.exists())) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/results/${job.id}`;
        return;
      }

      set.headers["Content-Type"] = "application/x-tar";
      set.headers["Content-Disposition"] = `attachment; filename="converted_files_${job.id}.tar"`;
      return outputTar;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
  )
  .get(
    "/preview/:id",
    async ({ params: { id }, user, set }) => {
      if (!ALLOW_UNAUTHENTICATED && !user) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/login`;
        return;
      }

      const job = db.query("SELECT * FROM jobs WHERE id = ?").as(Jobs).get(id);

      if (!job) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const isOwner = user?.id === job.user_id;

      // If authentication is enabled, users should only be able to access their own jobs.
      // If authentication is disabled, anyone can access job links.
      if (!ALLOW_UNAUTHENTICATED && !isOwner) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const preview = Bun.file(`${outputDir}/${job.id}/preview.pdf`);

      if (!(await preview.exists())) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/results/${job.id}`;
        return;
      }

      set.headers["Content-Type"] = "application/pdf";
      set.headers["Content-Disposition"] = `inline; filename="preview_${job.id}.pdf"`;
      return preview;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
  )
  .get(
    "/delete/:id",
    async ({ params: { id }, user, set }) => {
      if (!ALLOW_UNAUTHENTICATED && !user) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/login`;
        return;
      }

      const job = db.query("SELECT * FROM jobs WHERE id = ?").as(Jobs).get(id);

      if (!job) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const isOwner = user?.id === job.user_id;

      // If authentication is enabled, users should only be able to access their own jobs.
      // If authentication is disabled, anyone can access job links.
      if (!ALLOW_UNAUTHENTICATED && !isOwner) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      db.query("DELETE FROM jobs WHERE id = ?").run(id);
      db.query("DELETE FROM file_names WHERE job_id = ?").run(id);

      try {
        await Bun.$`rm -rf ${outputDir}/${job.id}`.quiet();
      } catch {}

      set.status = 302;
      set.headers.Location = `${WEBROOT}/history`;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
  )
  .post(
    "/erugo/share/:id",
    async ({ params: { id }, user, set }) => {
      if (!ALLOW_UNAUTHENTICATED && !user) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/login`;
        return;
      }

      const job = db.query("SELECT * FROM jobs WHERE id = ?").as(Jobs).get(id);

      if (!job) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      const isOwner = user?.id === job.user_id;

      // If authentication is enabled, users should only be able to access their own jobs.
      // If authentication is disabled, anyone can access job links.
      if (!ALLOW_UNAUTHENTICATED && !isOwner) {
        set.status = 302;
        set.headers.Location = `${WEBROOT}/history`;
        return;
      }

      // Mark "sharing" state (optional; safe if column exists)
      try {
        db.query("UPDATE jobs SET is_sharing = 1 WHERE id = ?").run(id);
      } catch {}

      try {
        await sendFileToErugo(job.id);
      } finally {
        try {
          db.query("UPDATE jobs SET is_sharing = 0 WHERE id = ?").run(id);
        } catch {}
      }

      set.status = 302;
      set.headers.Location = `${WEBROOT}/results/${job.id}`;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
    },
  );

const ResultsArticle = ({ job, files }: { job: Jobs; files: Filename[] }) => {
  const maxFiles = Number((job as any).num_files ?? 0);
  const doneFiles = Number(
    files.filter((f: any) => String((f as any).status || "").toLowerCase() === "done").length,
  );
const isDone = doneFiles === maxFiles;

  // NOTE: <a disabled> is ignored by browsers. If an action is not ready, render
  // a non-interactive element (no href) so it cannot be activated by mouse/keyboard.
  const disabledLinkClass = "opacity-50 cursor-not-allowed select-none";
  const busyAttrs = { disabled: true, "aria-busy": "true" } as const;

  return (
    <article class="article">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-contrast">Results</h1>

        <div class="flex flex-row gap-2">
          <a class="btn-secondary flex flex-row gap-2 text-contrast" href={`${WEBROOT}/history`}>
            <EyeIcon /> <p>History</p>
          </a>

          <a class="btn-secondary flex flex-row gap-2 text-contrast" href={`${WEBROOT}/`}>
            <p>Convert More</p>
          </a>
        </div>
      </div>

      <div class="mb-4 flex flex-col gap-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col">
            <p class="text-sm text-muted">Job</p>
            <p class="text-contrast">
              #{job.id} • {job.filename}
            </p>
          </div>

          <div class="flex flex-row gap-4">
<div class="flex flex-row gap-4">
          {isDone ? (
            <a
              class="flex btn-secondary flex-row gap-2 text-contrast"
              href={`${WEBROOT}/delete/${job.id}`}
            >
              <DeleteIcon /> <p>Delete</p>
            </a>
          ) : (
            <span
              class={`flex btn-secondary flex-row gap-2 text-contrast ${disabledLinkClass}`}
              aria-disabled="true"
              aria-busy="true"
            >
              <DeleteIcon /> <p>Delete</p>
            </span>
          )}

          {isDone ? (
            <a
              class="flex btn-primary flex-row gap-2 text-contrast"
              href={`${WEBROOT}/archive/${job.id}`}
              download={`converted_files_${job.id}.tar`}
            >
              <DownloadIcon /> <p>Tar</p>
            </a>
          ) : (
            <span
              class={`flex btn-primary flex-row gap-2 text-contrast ${disabledLinkClass}`}
              aria-disabled="true"
              aria-busy="true"
            >
              <DownloadIcon /> <p>Tar</p>
            </span>
          )}

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
        </div>

        <progress
          max={maxFiles}
          value={doneFiles}
          class={`
          mb-4 inline-block h-2 w-full appearance-none overflow-hidden rounded-full border-0
          bg-neutral-200
          [&::-webkit-progress-bar]:bg-neutral-200
          [&::-webkit-progress-value]:bg-primary
          [&::-moz-progress-bar]:bg-primary
        `}
        />

        <div class="flex flex-col gap-2">
          {files.map((file: any) => (
            <div
              class={`
              flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3
              dark:border-neutral-800 dark:bg-neutral-900
            `}
            >
              <div class="flex min-w-0 flex-col">
                <p class="truncate font-medium text-contrast">{file.output_filename}</p>
                <p class="text-sm text-muted">
                  {String(file.status || "").toLowerCase() === "done" ? "Done" : "Processing..."}
                </p>
              </div>

              <div class="flex flex-row gap-2">
                <a
                  class={`btn-secondary flex flex-row gap-2 text-contrast ${
                    String(file.status || "").toLowerCase() !== "done" ? disabledLinkClass : ""
                  }`}
                  href={`${WEBROOT}/download/${file.id}`}
                  {...(String(file.status || "").toLowerCase() !== "done" ? busyAttrs : {})}
                >
                  <DownloadIcon /> <p>Download</p>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div class="mt-6 flex flex-row flex-wrap gap-3">
          <a
            class={`btn-secondary flex flex-row gap-2 text-contrast ${
              !isDone ? disabledLinkClass : ""
            }`}
            href={`${WEBROOT}/preview/${job.id}`}
            {...(!isDone ? busyAttrs : {})}
          >
            <EyeIcon /> <p>Preview</p>
          </a>

          <form method="post" action={`${WEBROOT}/erugo/share/${job.id}`}>
            <button
              type="submit"
              class={`btn-secondary flex flex-row gap-2 text-contrast ${
                !isDone ? disabledLinkClass : ""
              }`}
              {...(!isDone ? busyAttrs : {})}
            >
              <ShareIcon /> <p>Share to Erugo</p>
            </button>
          </form>
        </div>
      </div>
    </article>
  );
};
