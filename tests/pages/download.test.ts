import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as tar from "tar";
import { createJob, createUser, jobDirs, request } from "./helpers/app";

async function userWithOutputs(files: Record<string, string>) {
  const user = await createUser();
  const job = createJob(user.id);
  const dirs = jobDirs(user.id, job);
  mkdirSync(dirs.output, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(`${dirs.output}${name}`, content);
  }
  return { user, job, dirs };
}

async function tarEntries(response: Response) {
  const dir = mkdtempSync(join(tmpdir(), "convertx-archive-"));
  try {
    const file = join(dir, "archive.tar");
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    const entries: string[] = [];
    await tar.list({ file, onReadEntry: (entry) => entries.push(entry.path) });
    return entries.sort();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("GET /download/:userId/:jobId/:fileName", () => {
  test("redirects to the login page without a session", async () => {
    const { user, job } = await userWithOutputs({ "a.csv": "a" });

    const response = await request(`/download/${user.id}/${job}/a.csv`, {
      headers: { accept: "text/html" },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("serves a converted file", async () => {
    const { user, job } = await userWithOutputs({ "a.csv": "converted" });

    const response = await request(`/download/${user.id}/${job}/a.csv`, {
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toStartWith("text/csv");
    expect(await response.text()).toBe("converted");
  });

  test("serves file names with encoded spaces and hashes", async () => {
    const { user, job } = await userWithOutputs({ "my file #1.csv": "spaced" });

    const response = await request(`/download/${user.id}/${job}/my%20file%20%231.csv`, {
      cookies: { auth: user.token },
    });

    expect(await response.text()).toBe("spaced");
  });

  test("answers 404 for a file that does not exist", async () => {
    const { user, job } = await userWithOutputs({});

    const response = await request(`/download/${user.id}/${job}/missing.csv`, {
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Converted file not found." });
  });

  test("refuses files of another user's job", async () => {
    const user = await createUser();
    const other = await userWithOutputs({ "secret.csv": "secret" });

    const response = await request(`/download/${other.user.id}/${other.job}/secret.csv`, {
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/results");
  });

  test("ignores the user id in the URL and only serves the caller's own files", async () => {
    const { user, job } = await userWithOutputs({ "a.csv": "mine" });
    const other = await createUser();
    mkdirSync(jobDirs(other.id, job).output, { recursive: true });
    writeFileSync(`${jobDirs(other.id, job).output}a.csv`, "theirs");

    const response = await request(`/download/${other.id}/${job}/a.csv`, {
      cookies: { auth: user.token },
    });

    expect(await response.text()).toBe("mine");
  });

  test("sanitizes the file name so files outside the job cannot be read", async () => {
    const { user, job } = await userWithOutputs({});
    const other = await userWithOutputs({ "secret.csv": "secret" });

    const traversal = encodeURIComponent(`../../${other.user.id}/${other.job}/secret.csv`);
    const response = await request(`/download/${user.id}/${job}/${traversal}`, {
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(404);
  });

  // BUG: Elysia already decodes path parameters and download.tsx decodes them a second
  // time, so file names containing "%" fail with a 500 "URI error" (and a literal "%20"
  // would be turned into a space). The results page links to such files. Remove
  // `.failing` once the second decodeURIComponent is dropped.
  test.failing("serves file names containing a percent sign", async () => {
    const { user, job } = await userWithOutputs({ "100%.csv": "percent" });

    const response = await request(`/download/${user.id}/${job}/100%25.csv`, {
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("percent");
  });
});

describe("GET /archive/:jobId", () => {
  test("redirects to the login page without a session", async () => {
    const { job } = await userWithOutputs({ "a.csv": "a" });

    const response = await request(`/archive/${job}`, { headers: { accept: "text/html" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("packs all converted files of the job into a tar archive", async () => {
    const { user, job } = await userWithOutputs({ "a.csv": "a", "b.csv": "b" });

    const response = await request(`/archive/${job}`, { cookies: { auth: user.token } });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/x-tar");
    expect(await tarEntries(response)).toEqual(["./", "./a.csv", "./b.csv"]);
  });

  test("does not include earlier archives in a new archive", async () => {
    const { user, job } = await userWithOutputs({ "a.csv": "a" });

    await request(`/archive/${job}`, { cookies: { auth: user.token } });
    const response = await request(`/archive/${job}`, { cookies: { auth: user.token } });

    expect(await tarEntries(response)).toEqual(["./", "./a.csv"]);
  });

  test("refuses another user's job", async () => {
    const user = await createUser();
    const other = await userWithOutputs({ "secret.csv": "secret" });

    const response = await request(`/archive/${other.job}`, { cookies: { auth: user.token } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/results");
  });
});
