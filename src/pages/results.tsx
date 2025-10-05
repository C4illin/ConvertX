import { Html } from "@elysiajs/html";
import { JWTPayloadSpec } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { ALLOW_UNAUTHENTICATED, WEBROOT } from "../helpers/env";
import { userService } from "./user";

function ResultsArticle({
  user,
  job,
  files,
  outputPath,
}: {
  user: {
    id: string;
  } & JWTPayloadSpec;
  job: Jobs;
  files: Filename[];
  outputPath: string;
}) {
  return (
    <article class="article">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-xl">Results</h1>
        <div>
          <a
            style={files.length !== job.num_files ? "pointer-events: none;" : ""}
            href={`${WEBROOT}/archive/${user.id}/${job.id}`}
            download={`converted_files_${job.id}.tar`}
          >
            <button
              type="button"
              class="float-right w-40 btn-primary"
              {...(files.length !== job.num_files ? { disabled: true, "aria-busy": "true" } : "")}
            >
              {files.length === job.num_files ? "Download All" : "Converting..."}
            </button>
          </a>
        </div>
      </div>
      <progress
        max={job.num_files}
        value={files.length}
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
            <th
              class={`
                px-2 py-2
                sm:px-4
              `}
            >
              Converted File Name
            </th>
            <th
              class={`
                px-2 py-2
                sm:px-4
              `}
            >
              Status
            </th>
            <th
              class={`
                px-2 py-2
                sm:px-4
              `}
            >
              View
            </th>
            <th
              class={`
                px-2 py-2
                sm:px-4
              `}
            >
              Download
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr>
              <td safe class="max-w-[20vw] truncate">
                {file.output_file_name}
              </td>
              <td safe>{file.status}</td>
              <td>
                <a
                  class={`
                    text-accent-500 underline
                    hover:text-accent-400
                  `}
                  href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                >
                  View
                </a>
              </td>
              <td>
                <a
                  class={`
                    text-accent-500 underline
                    hover:text-accent-400
                  `}
                  href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                  download={file.output_file_name}
                >
                  Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export const results = new Elysia()
  .use(userService)
  .get("/results/:jobId", async ({ params, jwt, set, redirect, cookie: { job_id }, user }) => {
    if (job_id?.value) {
      // Clear the job_id cookie since we are viewing the results
      job_id.remove();
    }

    const job = db
      .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
      .as(Jobs)
      .get(user.id, params.jobId);

    if (!job) {
      set.status = 404;
      return {
        message: "Job not found.",
      };
    }

    const outputPath = `${user.id}/${params.jobId}/`;

    const files = db
      .query("SELECT * FROM file_names WHERE job_id = ?")
      .as(Filename)
      .all(params.jobId);

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Result">
        <>
          <Header webroot={WEBROOT} allowUnauthenticated={ALLOW_UNAUTHENTICATED} loggedIn />
          <main
            class={`
              w-full flex-1 px-2
              sm:px-4
            `}
          >
            <ResultsArticle user={user} job={job} files={files} outputPath={outputPath} />
          </main>
          <script src={`${WEBROOT}/results.js`} defer />
        </>
      </BaseHtml>
    );
  }, { auth: true })
  .post("/progress/:jobId", async ({ jwt, set, params, cookie: { job_id }, user }) => {
    if (job_id?.value) {
      // Clear the job_id cookie since we are viewing the results
      job_id.remove();
    }

    const job = db
      .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
      .as(Jobs)
      .get(user.id, params.jobId);

    if (!job) {
      set.status = 404;
      return {
        message: "Job not found.",
      };
    }

    const outputPath = `${user.id}/${params.jobId}/`;

    const files = db
      .query("SELECT * FROM file_names WHERE job_id = ?")
      .as(Filename)
      .all(params.jobId);

    return <ResultsArticle user={user} job={job} files={files} outputPath={outputPath} />;
  }, { auth: true });
