import { afterEach, describe, expect, test } from "bun:test";
import { buildDownloadUrl } from "../../src/helpers/buildDownloadUrl";
import { createJob, createUser, request, resetEnv, setCookie, setEnv } from "./helpers/app";

afterEach(() => {
  resetEnv();
});

test("encodes reserved characters in download filenames", () => {
  expect(buildDownloadUrl("", "1/2/", "clip #1?.gif")).toBe("/download/1/2/clip%20%231%3F.gif");
});

test("preserves output path segments while encoding the filename", () => {
  expect(buildDownloadUrl("/convertx", "user/job/", "報告 100%.pdf")).toBe(
    "/convertx/download/user/job/%E5%A0%B1%E5%91%8A%20100%25.pdf",
  );
});

const done = (name: string) => ({
  file_name: `${name}.vcf`,
  output_file_name: `${name}.csv`,
  status: "Done",
});

describe.each([
  ["GET", "/results"],
  ["POST", "/progress"],
])("%s %s/:jobId", (method, route) => {
  test("requires a session", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const response = await request(`${route}/${job}`, {
      method,
      headers: { accept: "application/json" },
    });

    expect(response.status).toBe(401);
  });

  test.each([
    ["another user's job", true],
    ["a job that does not exist", false],
  ])("answers 404 for %s", async (_, exists) => {
    const user = await createUser();
    const other = await createUser();
    const job = exists ? createJob(other.id, { numFiles: 1, files: [done("secret")] }) : 999_999;

    const response = await request(`${route}/${job}`, { method, cookies: { auth: user.token } });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Job not found." });
  });

  test("lists the converted files with view and download links", async () => {
    const user = await createUser();
    const job = createJob(user.id, { numFiles: 2, files: [done("a"), done("my file #1")] });

    const body = await (
      await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
    ).text();

    expect(body).toContain(`href="/download/${user.id}/${job}/a.csv"`);
    expect(body).toContain(`href="/download/${user.id}/${job}/my%20file%20%231.csv"`);
    expect(body).toContain('download="my file #1.csv"');
  });

  test.each(["Failed, check logs", "File type not supported"])(
    "shows no links for files with status '%s'",
    async (status) => {
      const user = await createUser();
      const job = createJob(user.id, {
        numFiles: 1,
        files: [{ file_name: "a.xyz", output_file_name: "a.pdf", status }],
      });

      const body = await (
        await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
      ).text();

      expect(body).toContain("Unavailable");
      expect(body).toContain(`<td>${status}</td>`);
      expect(body).not.toContain("/download/");
    },
  );

  test("escapes file names and statuses", async () => {
    const user = await createUser();
    const name = '"><img src=x onerror=alert(1)>.csv';
    const job = createJob(user.id, {
      numFiles: 1,
      files: [{ file_name: "x", output_file_name: name, status: "<b>Done</b>" }],
    });

    const body = await (
      await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
    ).text();

    // neither the text nor the download attribute can be broken out of
    expect(body).not.toContain('"><img');
    expect(body).not.toContain("<b>Done</b>");
    expect(body).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;.csv");
    expect(body).toContain("&lt;b&gt;Done&lt;/b&gt;");
  });

  test("disables delete and tar download while files are still converting", async () => {
    const user = await createUser();
    const job = createJob(user.id, { numFiles: 2, files: [done("a")] });

    const body = await (
      await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
    ).text();

    expect(body.match(/aria-busy="true"/g)).toHaveLength(2);
    expect(body).toMatch(/<progress max="2"(?! value)/);
  });

  test("enables delete and tar download once every file is converted", async () => {
    const user = await createUser();
    const job = createJob(user.id, { numFiles: 2, files: [done("a"), done("b")] });

    const body = await (
      await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
    ).text();

    expect(body).not.toContain('aria-busy="true"');
    expect(body).toContain('<progress max="2" value="2"');
    expect(body).toContain(`action="/delete/${job}"`);
    expect(body).toContain(`href="/archive/${job}"`);
  });

  test("prefixes all links with WEBROOT", async () => {
    setEnv({ WEBROOT: "/convertx" });
    const user = await createUser();
    const job = createJob(user.id, { numFiles: 1, files: [done("a")] });

    const body = await (
      await request(`${route}/${job}`, { method, cookies: { auth: user.token } })
    ).text();

    expect(body).toContain(`href="/convertx/download/${user.id}/${job}/a.csv"`);
    expect(body).toContain(`action="/convertx/delete/${job}"`);
    expect(body).toContain(`href="/convertx/archive/${job}"`);
  });

  test("does not set cookies", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const response = await request(`${route}/${job}`, {
      method,
      cookies: { auth: user.token, jobId: job },
    });

    expect(setCookie(response, "jobId")).toBeUndefined();
    expect(setCookie(response, "auth")).toBeUndefined();
  });
});

describe("GET /results/:jobId", () => {
  test("renders a full page with the results script", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const body = await (await request(`/results/${job}`, { cookies: { auth: user.token } })).text();

    expect(body).toStartWith("<!doctype html>");
    expect(body).toContain("<title>ConvertX | Result</title>");
    expect(body).toContain('<script src="/results.js" defer');
  });
});

describe("POST /progress/:jobId", () => {
  test("renders only the results fragment for polling", async () => {
    const user = await createUser();
    const job = createJob(user.id);

    const body = await (
      await request(`/progress/${job}`, { method: "POST", cookies: { auth: user.token } })
    ).text();

    expect(body).toStartWith('<article class="article">');
    expect(body).not.toContain("<html");
  });
});
