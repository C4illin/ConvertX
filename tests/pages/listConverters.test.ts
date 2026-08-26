// The converters page is behind auth and reads HIDE_HISTORY at module load, so the
// env is set and a valid session cookie is minted before the page is imported below.
// The assertion is only about the header: with HIDE_HISTORY set, the History nav link
// must not render on this page, which previously omitted the hideHistory prop.
const JWT_SECRET = "test-secret";
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = JWT_SECRET;
process.env.HIDE_HISTORY = "true";
process.env.WEBROOT = "";

import { createHmac } from "node:crypto";
import { expect, test } from "bun:test";

const { listConverters } = await import("../../src/pages/listConverters");

// Minimal HS256 JWT so the authenticated route renders; @elysiajs/jwt verifies it.
function sessionCookie(): string {
  const b64url = (value: string) => Buffer.from(value).toString("base64url");
  const payload = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ id: "1", exp: Math.floor(Date.now() / 1000) + 3600 }),
  )}`;
  const signature = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `auth=${payload}.${signature}`;
}

// Regression test for #556.
test("converters page hides the History link when HIDE_HISTORY is set", async () => {
  const res = await listConverters.handle(
    new Request("http://localhost/converters", { headers: { Cookie: sessionCookie() } }),
  );
  expect(res.status).toBe(200);

  const html = await res.text();
  // Sanity: the authenticated header actually rendered.
  expect(html).toContain('href="/account"');
  // The History link must be gone.
  expect(html).not.toContain('href="/history"');
});
