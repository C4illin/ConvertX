import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createJob, createUser, db, jobDirs, request } from "./helpers/app";

async function userWithJobs(count = 1) {
  const user = await createUser();
  const jobs = Array.from({ length: count }, () => {
    const job = createJob(user.id, { numFiles: 1 });
    const dirs = jobDirs(user.id, job);
    mkdirSync(dirs.uploads, { recursive: true });
    mkdirSync(dirs.output, { recursive: true });
    writeFileSync(`${dirs.uploads}in.vcf`, "in");
    writeFileSync(`${dirs.output}out.csv`, "out");
    return job;
  });
  return { user, jobs };
}

function jobExists(jobId: number | string) {
  return db.query("SELECT id FROM jobs WHERE id = ?").get(jobId) !== null;
}

function filesExist(userId: number, jobId: number) {
  const dirs = jobDirs(userId, jobId);
  return existsSync(dirs.uploads) || existsSync(dirs.output);
}

describe("POST /delete/:jobId", () => {
  test("requires a session", async () => {
    const { user, jobs } = await userWithJobs();

    const response = await request(`/delete/${jobs[0]}`, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    expect(response.status).toBe(401);
    expect(jobExists(jobs[0] ?? 0)).toBe(true);
    expect(filesExist(user.id, jobs[0] ?? 0)).toBe(true);
  });

  test("deletes the job with its uploaded and converted files", async () => {
    const { user, jobs } = await userWithJobs();
    const job = jobs[0] ?? 0;

    const response = await request(`/delete/${job}`, {
      method: "POST",
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/history");
    expect(jobExists(job)).toBe(false);
    expect(filesExist(user.id, job)).toBe(false);
  });

  test("refuses to delete another user's job", async () => {
    const user = await createUser();
    const other = await userWithJobs();
    const job = other.jobs[0] ?? 0;

    const response = await request(`/delete/${job}`, {
      method: "POST",
      cookies: { auth: user.token },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/results");
    expect(jobExists(job)).toBe(true);
    expect(filesExist(other.user.id, job)).toBe(true);
  });

  test("cannot be triggered by a GET request (CSRF protection)", async () => {
    const { user, jobs } = await userWithJobs();
    const job = jobs[0] ?? 0;

    const response = await request(`/delete/${job}`, { cookies: { auth: user.token } });

    expect(response.status).toBe(404);
    expect(jobExists(job)).toBe(true);
  });
});

describe("POST /delete-multiple", () => {
  const deleteMultiple = (token: string, jobIds: unknown) =>
    request("/delete-multiple", { cookies: { auth: token }, json: { jobIds } });

  test("requires a session", async () => {
    const { jobs } = await userWithJobs();

    const response = await request("/delete-multiple", {
      headers: { accept: "application/json" },
      json: { jobIds: jobs.map(String) },
    });

    expect(response.status).toBe(401);
    expect(jobExists(jobs[0] ?? 0)).toBe(true);
  });

  test("deletes all given jobs with their files", async () => {
    const { user, jobs } = await userWithJobs(2);

    const response = await deleteMultiple(user.token, jobs.map(String));

    expect(await response.json()).toEqual({
      success: true,
      deleted: 2,
      failed: 0,
      details: { success: jobs.map(String), failed: [] },
    });
    for (const job of jobs) {
      expect(jobExists(job)).toBe(false);
      expect(filesExist(user.id, job)).toBe(false);
    }
  });

  test("reports jobs that do not exist or belong to another user", async () => {
    const { user, jobs } = await userWithJobs();
    const other = await userWithJobs();
    const foreign = String(other.jobs[0]);

    const response = await deleteMultiple(user.token, [String(jobs[0]), foreign, "999999"]);

    expect(await response.json()).toEqual({
      success: false,
      deleted: 1,
      failed: 2,
      details: {
        success: [String(jobs[0])],
        failed: [
          { jobId: foreign, error: "Job not found or unauthorized" },
          { jobId: "999999", error: "Job not found or unauthorized" },
        ],
      },
    });
    expect(jobExists(foreign)).toBe(true);
    expect(filesExist(other.user.id, Number(foreign))).toBe(true);
  });

  test("rejects an empty list", async () => {
    const user = await createUser();

    const response = await deleteMultiple(user.token, []);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, message: "Invalid job IDs provided" });
  });

  test.each([
    ["more than 100 job ids", Array.from({ length: 101 }, (_, i) => String(i))],
    ["job ids that are not strings", [1, 2]],
    ["a value that is not a list", "1"],
  ])("rejects %s", async (_, jobIds) => {
    const user = await createUser();

    const response = await deleteMultiple(user.token, jobIds);

    expect(response.status).toBe(422);
  });
});
