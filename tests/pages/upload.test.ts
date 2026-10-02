import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJob, createUser, jobDirs, request } from "./helpers/app";

function uploadForm(...files: File[]) {
  const form = new FormData();
  for (const file of files) {
    form.append("file", file);
  }
  return form;
}

describe("POST /upload", () => {
  test("requires a session", async () => {
    const response = await request("/upload", {
      method: "POST",
      headers: { accept: "application/json" },
      body: uploadForm(new File(["x"], "a.txt")),
    });

    expect(response.status).toBe(401);
  });

  test("redirects home without a job", async () => {
    const user = await createUser();

    const response = await request("/upload", {
      method: "POST",
      cookies: { auth: user.token },
      body: uploadForm(new File(["x"], "a.txt")),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  test("refuses to upload into another user's job", async () => {
    const user = await createUser();
    const other = await createUser();
    const otherJob = createJob(other.id);

    const response = await request("/upload", {
      method: "POST",
      cookies: { auth: user.token, jobId: otherJob },
      body: uploadForm(new File(["x"], "a.txt")),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(existsSync(jobDirs(other.id, otherJob).uploads)).toBe(false);
    expect(existsSync(jobDirs(user.id, otherJob).uploads)).toBe(false);
  });

  test("stores a single file in the job's upload directory", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const response = await request("/upload", {
      method: "POST",
      cookies: { auth: user.token, jobId: job },
      body: uploadForm(new File(["hello world"], "notes.txt")),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Files uploaded successfully." });
    expect(await readFile(`${jobDirs(user.id, job).uploads}notes.txt`, "utf-8")).toBe(
      "hello world",
    );
  });

  test("stores multiple files at once", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    await request("/upload", {
      method: "POST",
      cookies: { auth: user.token, jobId: job },
      body: uploadForm(new File(["1"], "one.txt"), new File(["2"], "two.txt")),
    });

    expect(readdirSync(jobDirs(user.id, job).uploads).sort()).toEqual(["one.txt", "two.txt"]);
  });

  test("sanitizes file names so uploads cannot escape the job directory", async () => {
    const user = await createUser();
    const job = createJob(user.id);
    const { uploads } = jobDirs(user.id, job);

    await request("/upload", {
      method: "POST",
      cookies: { auth: user.token, jobId: job },
      body: uploadForm(new File(["evil"], "../../../evil.txt")),
    });

    expect(readdirSync(uploads)).toEqual(["......evil.txt"]);
    expect(existsSync(resolve(uploads, "../../../evil.txt"))).toBe(false);
  });

  test("rejects a request without files", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const response = await request("/upload", {
      method: "POST",
      cookies: { auth: user.token, jobId: job },
      body: new FormData(),
    });

    expect(response.status).toBe(422);
  });
});
