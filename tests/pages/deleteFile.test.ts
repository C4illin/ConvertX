import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createJob, createUser, jobDirs, request, uploadsDir } from "./helpers/app";

async function userWithUploads(...fileNames: string[]) {
  const user = await createUser();
  const job = createJob(user.id);
  const dirs = jobDirs(user.id, job);
  mkdirSync(dirs.uploads, { recursive: true });
  for (const fileName of fileNames) {
    writeFileSync(`${dirs.uploads}${fileName}`, fileName);
  }
  return { user, job, dirs };
}

describe("POST /delete", () => {
  test("requires a session", async () => {
    const response = await request("/delete", {
      headers: { accept: "application/json" },
      json: { filename: "a.txt" },
    });

    expect(response.status).toBe(401);
  });

  test("redirects home without a job", async () => {
    const { user, dirs } = await userWithUploads("a.txt");

    const response = await request("/delete", {
      cookies: { auth: user.token },
      json: { filename: "a.txt" },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(existsSync(`${dirs.uploads}a.txt`)).toBe(true);
  });

  test("refuses to delete from another user's job", async () => {
    const { user } = await userWithUploads();
    const other = await userWithUploads("a.txt");

    const response = await request("/delete", {
      cookies: { auth: user.token, jobId: other.job },
      json: { filename: "a.txt" },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(existsSync(`${other.dirs.uploads}a.txt`)).toBe(true);
  });

  test("deletes only the given uploaded file", async () => {
    const { user, job, dirs } = await userWithUploads("a.txt", "b.txt");

    const response = await request("/delete", {
      cookies: { auth: user.token, jobId: job },
      json: { filename: "a.txt" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "File deleted successfully." });
    expect(existsSync(`${dirs.uploads}a.txt`)).toBe(false);
    expect(existsSync(`${dirs.uploads}b.txt`)).toBe(true);
  });

  test("sanitizes the file name so files outside the job cannot be deleted", async () => {
    const { user, job } = await userWithUploads();
    const other = await userWithUploads("keep.txt");

    await request("/delete", {
      cookies: { auth: user.token, jobId: job },
      json: { filename: `../../${other.user.id}/${other.job}/keep.txt` },
    });

    expect(existsSync(`${other.dirs.uploads}keep.txt`)).toBe(true);
  });

  // BUG: unlink errors are not handled, so deleting a file that does not exist answers
  // with a 500 whose body contains the absolute upload path on the server. Remove
  // `.failing` once deleteFile.tsx handles the missing file.
  test.failing("answers a missing file without a server error or server paths", async () => {
    const { user, job } = await userWithUploads();

    const response = await request("/delete", {
      cookies: { auth: user.token, jobId: job },
      json: { filename: "missing.txt" },
    });

    expect(response.status).toBeLessThan(500);
    expect(await response.text()).not.toContain(uploadsDir);
  });
});
