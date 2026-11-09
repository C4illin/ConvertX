import { mkdirSync, rmSync } from "node:fs";

import type { Cookie } from "elysia";
import sanitize from "sanitize-filename";

import { getPossibleTargets, handleConvert, outputFileName } from "../converters/main";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { buildJobArchive } from "../helpers/buildJobArchive";
import { normalizeFiletype } from "../helpers/normalizeFiletype";
import { outputDir, uploadsDir } from "../index";

/** An error the API reports to the client as `{ error, message }` with this status. */
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 404 | 422,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  /** Elysia sends this instead of its default plain-text error. */
  toResponse(): Response {
    return Response.json({ error: this.code, message: this.message }, { status: this.status });
  }
}

interface JobFile {
  /** The uploaded file's name. */
  input: string;
  status: "converting" | "done" | "failed";
  /** The converter's message when the conversion failed. */
  error?: string;
  /** Converted files. Most conversions make one; some, such as PDF to images, make several. */
  outputs: { name: string; url: string }[];
}

export interface Job {
  id: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  files: JobFile[];
}

function extension(fileName: string): string {
  return fileName.includes(".") ? normalizeFiletype(fileName.split(".").pop() ?? "") : "";
}

/**
 * Picks a converter that can turn every file into `to`: the one asked for, or else the first that
 * handles them all, as the web UI offers them.
 */
export function chooseConverter(fileNames: string[], to: string, wanted?: string): string {
  const types = [...new Set(fileNames.map(extension))];
  const candidates = Object.entries(getPossibleTargets(types[0] ?? ""))
    .filter(([, targets]) => targets.includes(to))
    .map(([name]) => name);
  const usable = candidates.filter((name) =>
    types.every((type) => getPossibleTargets(type)[name]?.includes(to)),
  );

  if (wanted) {
    if (usable.includes(wanted)) return wanted;
    throw new ApiError(
      422,
      "unsupported_conversion",
      `${wanted} can't convert ${types.map((type) => `.${type}`).join(", ")} to .${to}.` +
        (usable.length ? ` Converters that can: ${usable.join(", ")}.` : ""),
    );
  }
  const chosen = usable[0];
  if (chosen) return chosen;
  throw new ApiError(
    422,
    "unsupported_conversion",
    `No converter turns ${types.map((type) => `.${type || "(no extension)"}`).join(", ")} into .${to}. ` +
      `GET /api/v1/targets?from=${types[0] ?? ""} lists what each type can become.`,
  );
}

/** Checks the target format the same way the web UI does. */
export function cleanTarget(to: string): string {
  const target = normalizeFiletype(to.trim().replace(/^\./, ""));
  if (!target || target.includes("/") || target.includes("\\") || target.includes("..")) {
    throw new ApiError(400, "invalid_format", `"${to}" isn't a file format.`);
  }
  return target;
}

/**
 * Saves the uploads, records the job and starts converting in the background. `done` settles when
 * every file has been converted.
 */
export async function createJob(
  userId: string,
  files: File[],
  to: string,
  converter: string,
): Promise<{ id: number; done: Promise<void> }> {
  const names = files.map((file) => sanitize(file.name));
  if (names.some((name) => name === "")) {
    throw new ApiError(400, "invalid_file_name", "Every file needs a name with an extension.");
  }
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) {
    throw new ApiError(
      400,
      "duplicate_file_name",
      `Two files are called "${duplicate}". Rename one.`,
    );
  }
  // Names that differ only in extension, such as logo.png and logo.svg, give the same
  // output name, and the second result would overwrite the first.
  const inputFor = new Map<string, string>();
  for (const name of names) {
    const output = outputFileName(name, to);
    const other = inputFor.get(output);
    if (other) {
      throw new ApiError(
        400,
        "duplicate_output_name",
        `"${other}" and "${name}" would both become "${output}". Rename one, or convert them in separate jobs.`,
      );
    }
    inputFor.set(output, name);
  }

  const job = db
    .query(
      "INSERT INTO jobs (user_id, date_created, status, num_files) VALUES (?1, ?2, 'pending', ?3) RETURNING id",
    )
    .get(userId, new Date().toISOString(), names.length) as { id: number };
  const userUploadsDir = `${uploadsDir}${userId}/${job.id}/`;
  const userOutputDir = `${outputDir}${userId}/${job.id}/`;
  try {
    mkdirSync(userOutputDir, { recursive: true });
    await Promise.all(files.map((file, i) => Bun.write(`${userUploadsDir}${names[i]}`, file)));
  } catch (error) {
    // The client never gets this job's id, so nothing of it should be left behind. The record
    // goes first: whatever stopped the upload may stop removing its folders too.
    db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
    for (const dir of [userUploadsDir, userOutputDir]) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // The error worth reporting is the one rethrown below.
      }
    }
    throw error;
  }

  // handleConvert reads the job id from the web UI's cookie; it only needs `.value`.
  const jobId = { value: String(job.id) } as Cookie<string | undefined>;
  const done = handleConvert(names, userUploadsDir, userOutputDir, to, converter, jobId).then(
    () => {
      // handleConvert also resolves when files fail; each file's record says how it went.
      const allDone = describeJob(userId, job.id, "").files.every((f) => f.status === "done");
      db.query("UPDATE jobs SET status = ? WHERE id = ?").run(
        allDone ? "completed" : "failed",
        job.id,
      );
    },
    (error: unknown) => {
      console.error(`API job ${job.id} failed:`, error);
      db.query("UPDATE jobs SET status = 'failed' WHERE id = ?").run(job.id);
    },
  );
  return { id: job.id, done };
}

function findJob(userId: string, jobId: string | number): Jobs | null {
  return db.query("SELECT * FROM jobs WHERE user_id = ? AND id = ?").as(Jobs).get(userId, jobId);
}

function notFound(jobId: string | number): ApiError {
  return new ApiError(404, "job_not_found", `There's no job ${jobId}.`);
}

/** A job with each file's progress and its converted files. */
export function describeJob(userId: string, jobId: string | number, apiRoot: string): Job {
  const job = findJob(userId, jobId);
  if (!job) throw notFound(jobId);

  const rows = db
    .query("SELECT * FROM file_names WHERE job_id = ? ORDER BY id")
    .as(Filename)
    .all(job.id);
  let uploaded: string[] = [];
  try {
    uploaded = [...new Bun.Glob("*").scanSync({ cwd: `${uploadsDir}${userId}/${job.id}` })];
  } catch {
    // The uploads may already have been cleaned up; the file records still say what happened.
  }
  const inputs = [...new Set([...uploaded, ...rows.map((row) => row.file_name)])].sort();

  const files = inputs.map((input): JobFile => {
    const results = rows.filter((row) => row.file_name === input);
    if (results.length === 0) {
      // Rows appear when a file finishes. A finished job with no row lost the file.
      return job.status === "pending"
        ? { input, status: "converting", outputs: [] }
        : {
            input,
            status: "failed",
            error: "The conversion stopped before this file.",
            outputs: [],
          };
    }
    const failed = results.find((row) => row.status !== "Done");
    if (failed) return { input, status: "failed", error: failed.status, outputs: [] };
    return {
      input,
      status: "done",
      outputs: results.map((row) => ({
        name: row.output_file_name,
        url: `${apiRoot}/jobs/${job.id}/files/${encodeURIComponent(row.output_file_name)}`,
      })),
    };
  });

  const status = job.status === "completed" || job.status === "failed" ? job.status : "pending";
  return { id: job.id, status, createdAt: job.date_created, files };
}

export function listJobs(userId: string, limit: number, offset: number) {
  const jobs = db
    .query(
      "SELECT * FROM jobs WHERE user_id = ? AND num_files > 0 ORDER BY id DESC LIMIT ? OFFSET ?",
    )
    .as(Jobs)
    .all(userId, limit, offset);
  const { total } = db
    .query("SELECT count(*) AS total FROM jobs WHERE user_id = ? AND num_files > 0")
    .get(userId) as { total: number };
  return { jobs, total };
}

/** The path of a converted file, after checking it belongs to the user's job. */
export async function outputFile(
  userId: string,
  jobId: string | number,
  name: string,
): Promise<string> {
  const job = findJob(userId, jobId);
  if (!job) throw notFound(jobId);
  const file = `${outputDir}${userId}/${job.id}/${sanitize(name)}`;
  if (!(await Bun.file(file).exists())) {
    throw new ApiError(
      404,
      "file_not_found",
      `Job ${job.id} has no converted file called "${name}".`,
    );
  }
  return file;
}

/** A tar of every converted file in a job, shared with the web interface's archive download. */
export async function archiveJob(userId: string, jobId: string | number): Promise<string> {
  const job = findJob(userId, jobId);
  if (!job) throw notFound(jobId);
  return buildJobArchive(`${outputDir}${userId}/${job.id}`, String(job.id));
}

/** Deletes a job, its uploads, its results and its file records. */
export function deleteJob(userId: string, jobId: string | number): void {
  const job = findJob(userId, jobId);
  if (!job) throw notFound(jobId);
  rmSync(`${outputDir}${userId}/${job.id}`, { recursive: true, force: true });
  rmSync(`${uploadsDir}${userId}/${job.id}`, { recursive: true, force: true });
  db.query("DELETE FROM file_names WHERE job_id = ?").run(job.id);
  db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
}
