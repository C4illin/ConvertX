import { describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createJob, createUser, db, jobDirs, request, waitFor } from "./helpers/app";

type JobRow = { status: string; num_files: number };
type FileRow = { file_name: string; output_file_name: string; status: string };

function jobRow(jobId: number) {
  return db.query("SELECT status, num_files FROM jobs WHERE id = ?").get(jobId) as JobRow;
}

function fileRows(jobId: number) {
  return db
    .query(
      "SELECT file_name, output_file_name, status FROM file_names WHERE job_id = ? ORDER BY file_name",
    )
    .all(jobId) as FileRow[];
}

async function userWithJob() {
  const user = await createUser();
  const job = createJob(user.id);
  return { user, job, dirs: jobDirs(user.id, job) };
}

function convertRequest(
  cookies: { auth: string; jobId?: number },
  form: { convert_to: string; file_names: string },
) {
  return request("/convert", { cookies, form });
}

describe("POST /convert", () => {
  test("requires a session", async () => {
    const response = await request("/convert", {
      headers: { accept: "application/json" },
      form: { convert_to: "csv,vcf", file_names: "[]" },
    });

    expect(response.status).toBe(401);
  });

  test("redirects home without a job", async () => {
    const { user } = await userWithJob();

    const response = await convertRequest(
      { auth: user.token },
      { convert_to: "csv,vcf", file_names: '["a.vcf"]' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  test("refuses to convert another user's job", async () => {
    const { user } = await userWithJob();
    const other = await userWithJob();

    const response = await convertRequest(
      { auth: user.token, jobId: other.job },
      { convert_to: "csv,vcf", file_names: '["a.vcf"]' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(jobRow(other.job).status).toBe("not started");
  });

  test.each([
    ["no converter is given", "csv"],
    ["the target contains a path separator", "a/b,vcf"],
    ["the target contains a backslash", "a\\b,vcf"],
    ["the target points to a parent directory", "..,vcf"],
  ])("redirects home without converting when %s", async (_, convertTo) => {
    const { user, job } = await userWithJob();

    const response = await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: convertTo, file_names: '["a.vcf"]' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(jobRow(job).status).toBe("not started");
  });

  test("redirects home without converting when no files are given", async () => {
    const { user, job } = await userWithJob();

    const response = await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: "csv,vcf", file_names: "[]" },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(jobRow(job).status).toBe("not started");
  });

  test("converts the uploaded files in the background and shows the results", async () => {
    const { user, job, dirs } = await userWithJob();
    mkdirSync(dirs.uploads, { recursive: true });
    await writeFile(`${dirs.uploads}a.vcf`, "BEGIN:VCARD\nFN:Alice\nEND:VCARD\n");
    await writeFile(`${dirs.uploads}b.vcf`, "BEGIN:VCARD\nFN:Bob\nEND:VCARD\n");

    const response = await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: "csv,vcf", file_names: '["a.vcf","b.vcf"]' },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`/results/${job}`);
    expect(jobRow(job).num_files).toBe(2);

    await waitFor(() => jobRow(job).status === "completed");
    expect(fileRows(job)).toEqual([
      { file_name: "a.vcf", output_file_name: "a.csv", status: "Done" },
      { file_name: "b.vcf", output_file_name: "b.csv", status: "Done" },
    ]);
    expect(await readFile(`${dirs.output}a.csv`, "utf-8")).toBe('Full Name\n"Alice"');
  });

  test("normalizes the target type before converting", async () => {
    const { user, job } = await userWithJob();

    await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: "JPG,doesnotexist", file_names: '["photo.png"]' },
    );

    await waitFor(() => jobRow(job).status === "completed");
    // jpg is normalized to jpeg, whose files get the .jpg extension
    expect(fileRows(job)).toEqual([
      { file_name: "photo.png", output_file_name: "photo.jpg", status: "File type not supported" },
    ]);
  });

  test("sanitizes file names so conversions cannot read outside the job directory", async () => {
    const { user, job } = await userWithJob();

    await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: "csv,vcf", file_names: '["../../secret.vcf"]' },
    );

    await waitFor(() => jobRow(job).status === "completed");
    expect(fileRows(job)).toEqual([
      {
        file_name: "....secret.vcf",
        output_file_name: "....secret.csv",
        status: "Failed, check logs",
      },
    ]);
  });

  // BUG: file_names is parsed and indexed before it is validated, so a value that is not a
  // JSON array ends in a 500 instead of the redirect used for every other invalid input.
  // Remove `.failing` once convert.tsx validates the parsed value first.
  test.failing.each([
    ["is not JSON", "not json"],
    ["is a JSON string", '"a.vcf"'],
  ])("redirects home when file_names %s", async (_, fileNames) => {
    const { user, job } = await userWithJob();

    const response = await convertRequest(
      { auth: user.token, jobId: job },
      { convert_to: "csv,vcf", file_names: fileNames },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });
});
