// The results page is behind auth and reads HIDE_HISTORY at module load, so the env is
// set and a session cookie minted before the page is imported below. buildDownloadUrl
// has no env dependency, so importing it statically above is safe.
const JWT_SECRET = "test-secret";
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = JWT_SECRET;
process.env.HIDE_HISTORY = "true";
process.env.WEBROOT = "";

import { createHmac } from "node:crypto";
import { expect, test } from "bun:test";
import { buildDownloadUrl } from "../../src/helpers/buildDownloadUrl";

const { default: db } = await import("../../src/db/db");
const { results } = await import("../../src/pages/results");

test("encodes reserved characters in download filenames", () => {
  expect(buildDownloadUrl("", "1/2/", "clip #1?.gif")).toBe("/download/1/2/clip%20%231%3F.gif");
});

test("preserves output path segments while encoding the filename", () => {
  expect(buildDownloadUrl("/convertx", "user/job/", "報告 100%.pdf")).toBe(
    "/convertx/download/user/job/%E5%A0%B1%E5%91%8A%20100%25.pdf",
  );
});

// Minimal HS256 JWT so the authenticated route renders; @elysiajs/jwt verifies it.
function sessionCookie(): string {
  const b64url = (value: string) => Buffer.from(value).toString("base64url");
  const payload = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ id: "1", exp: Math.floor(Date.now() / 1000) + 3600 }),
  )}`;
  const signature = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `auth=${payload}.${signature}`;
}

// Regression test for #556 on the results page (the scenario in the report: the header
// shown right after a conversion). Previously this page omitted the hideHistory prop.
test("results page hides the History link when HIDE_HISTORY is set", async () => {
  db.query("INSERT INTO users (id, email, password) VALUES (1, 'test@example.com', 'x')").run();
  db.query(
    "INSERT INTO jobs (id, user_id, date_created, status, num_files) VALUES (1, 1, '2026-01-01', 'done', 0)",
  ).run();

  const res = await results.handle(
    new Request("http://localhost/results/1", { headers: { Cookie: sessionCookie() } }),
  );
  expect(res.status).toBe(200);

  const html = await res.text();
  // Sanity: the authenticated header actually rendered.
  expect(html).toContain('href="/account"');
  // The History link must be gone.
  expect(html).not.toContain('href="/history"');
});
