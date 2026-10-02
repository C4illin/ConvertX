import { afterEach, describe, expect, test } from "bun:test";
import { createJob, createUser, request, resetEnv, setEnv } from "./helpers/app";

afterEach(() => {
  resetEnv();
});

const file = (name: string, status = "Done") => ({
  file_name: `${name}.vcf`,
  output_file_name: `${name}.csv`,
  status,
});

async function historyOf(token: string) {
  return (await request("/history", { cookies: { auth: token } })).text();
}

describe("GET /history", () => {
  test("redirects to the login page without a session", async () => {
    const response = await request("/history", { headers: { accept: "text/html" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("redirects home when the history is hidden", async () => {
    setEnv({ HIDE_HISTORY: true });
    const user = await createUser();

    const response = await request("/history", { cookies: { auth: user.token } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  test("lists the user's jobs, newest first", async () => {
    const user = await createUser();
    const older = createJob(user.id, { numFiles: 1, files: [file("old")] });
    const newer = createJob(user.id, { numFiles: 1, files: [file("new")] });

    const body = await historyOf(user.token);

    expect(body.indexOf(`id="job-row-${newer}"`)).toBeGreaterThan(-1);
    expect(body.indexOf(`id="job-row-${older}"`)).toBeGreaterThan(
      body.indexOf(`id="job-row-${newer}"`),
    );
    expect(body).toContain(`href="/results/${newer}"`);
    expect(body).toContain(`action="/delete/${newer}"`);
  });

  test("shows progress and file details of a job", async () => {
    const user = await createUser();
    const job = createJob(user.id, {
      numFiles: 3,
      status: "pending",
      files: [file("a"), file("b", "Failed, check logs")],
    });

    const body = await historyOf(user.token);
    const row = body.slice(
      body.indexOf(`id="job-row-${job}"`),
      body.indexOf(`id="details-${job}"`),
    );
    const details = body.slice(body.indexOf(`id="details-${job}"`));

    expect(row).toContain("<td>3</td>");
    expect(row).toContain('<td class="max-sm:hidden">2</td>');
    expect(row).toContain("<td>pending</td>");
    expect(details).toContain('title="a.vcf"');
    expect(details).toContain('title="b.csv"');
  });

  test("hides jobs without files", async () => {
    const user = await createUser();
    const empty = createJob(user.id, { numFiles: 0 });

    const body = await historyOf(user.token);

    expect(body).not.toContain(`id="job-row-${empty}"`);
  });

  test("does not show other users' jobs", async () => {
    const user = await createUser();
    const other = await createUser();
    const foreign = createJob(other.id, { numFiles: 1, files: [file("foreign")] });

    const body = await historyOf(user.token);

    expect(body).not.toContain(`id="job-row-${foreign}"`);
    expect(body).not.toContain("foreign.vcf");
  });

  test("escapes file names and statuses", async () => {
    const user = await createUser();
    createJob(user.id, {
      numFiles: 1,
      status: "<b>pending</b>",
      files: [
        { file_name: '"><script>alert(1)</script>.vcf', output_file_name: "x.csv", status: "Done" },
      ],
    });

    const body = await historyOf(user.token);

    // neither the text nor the title attribute can be broken out of
    expect(body).not.toContain('"><script>');
    expect(body).not.toContain("<b>pending</b>");
    expect(body).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;.vcf");
    expect(body).toContain("&lt;b&gt;pending&lt;/b&gt;");
  });
});
