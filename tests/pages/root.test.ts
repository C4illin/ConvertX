import { afterEach, describe, expect, test } from "bun:test";
import {
  app,
  createUser,
  db,
  request,
  resetEnv,
  setCookie,
  setCookieValue,
  setEnv,
} from "./helpers/app";

afterEach(() => {
  resetEnv();
});

type JobRow = { id: number; user_id: string; date_created: string; status: string };

function jobsOf(userId: number | string) {
  return db.query("SELECT * FROM jobs WHERE user_id = ? ORDER BY id").all(userId) as JobRow[];
}

async function userIdOf(response: Response) {
  const payload = await app.decorator.jwt.verify(setCookieValue(response, "auth") ?? "");
  return payload ? payload.id : undefined;
}

describe("GET / with accounts", () => {
  test("redirects to the login page without a session", async () => {
    const response = await request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("redirects to the login page for an invalid session", async () => {
    const response = await request("/", { cookies: { auth: "not-a-jwt" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("clears the session of an account that no longer exists", async () => {
    const user = await createUser();
    db.query("DELETE FROM users WHERE id = ?").run(user.id);

    const response = await request("/", { cookies: { auth: user.token } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(setCookie(response, "auth")).toContain("Max-Age=0");
    // no job is started for the deleted account
    expect(jobsOf(user.id)).toEqual([]);
  });

  test("starts a new job and remembers it in the jobId cookie", async () => {
    const user = await createUser();

    const response = await request("/", { cookies: { auth: user.token } });

    expect(response.status).toBe(200);
    const jobs = jobsOf(user.id);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("not started");
    expect(Date.now() - Date.parse(jobs[0]?.date_created ?? "")).toBeLessThan(60_000);

    expect(setCookieValue(response, "jobId")).toBe(String(jobs[0]?.id));
    expect(setCookie(response, "jobId")).toContain("HttpOnly");
    expect(setCookie(response, "jobId")).toContain("Secure");
    expect(setCookie(response, "jobId")).toContain("SameSite=Strict");
    expect(setCookie(response, "jobId")).toContain(`Max-Age=${24 * 60 * 60}`);
  });

  test("starts a fresh job on every visit", async () => {
    const user = await createUser();

    const first = await request("/", { cookies: { auth: user.token } });
    const second = await request("/", { cookies: { auth: user.token } });

    expect(jobsOf(user.id)).toHaveLength(2);
    expect(Number(setCookieValue(second, "jobId"))).toBeGreaterThan(
      Number(setCookieValue(first, "jobId")),
    );
  });

  test("offers every target of every converter", async () => {
    const user = await createUser();

    const body = await (await request("/", { cookies: { auth: user.token } })).text();

    expect(body).toContain('action="/convert"');
    expect(body).toContain('<option value="csv,vcf">csv</option>');
    expect(body).toContain('data-value="png,inkscape"');
  });

  test("links the account and logoff pages in the header", async () => {
    const user = await createUser();

    const body = await (await request("/", { cookies: { auth: user.token } })).text();

    expect(body).toContain('href="/account"');
    expect(body).toContain('href="/logoff"');
  });
});

describe("GET / without accounts (ALLOW_UNAUTHENTICATED)", () => {
  test("creates an anonymous session and a job for visitors without a session", async () => {
    setEnv({ ALLOW_UNAUTHENTICATED: true });

    const response = await request("/");

    expect(response.status).toBe(200);
    const userId = await userIdOf(response);
    // anonymous ids start at 2^24 so they never collide with registered accounts
    expect(Number(userId)).toBeGreaterThanOrEqual(2 ** 24);
    expect(setCookie(response, "auth")).toContain(`Max-Age=${24 * 60 * 60}`);
    expect(jobsOf(userId ?? "")).toHaveLength(1);
  });

  test("gives every anonymous visitor a different id", async () => {
    setEnv({ ALLOW_UNAUTHENTICATED: true });

    const first = await userIdOf(await request("/"));
    const second = await userIdOf(await request("/"));

    expect(first).not.toBe(second);
  });

  test("shares one anonymous id when UNAUTHENTICATED_USER_SHARING is enabled", async () => {
    setEnv({ ALLOW_UNAUTHENTICATED: true, UNAUTHENTICATED_USER_SHARING: true });

    expect(await userIdOf(await request("/"))).toBe("0");
    expect(await userIdOf(await request("/"))).toBe("0");
  });

  test("hides the account and logoff links", async () => {
    setEnv({ ALLOW_UNAUTHENTICATED: true });

    const body = await (await request("/")).text();

    expect(body).not.toContain('href="/account"');
    expect(body).not.toContain('href="/logoff"');
  });

  // BUG: the ALLOW_UNAUTHENTICATED branch runs before the session check, so every visit
  // replaces the existing session (even a registered account's) with a new anonymous id
  // and the user loses access to their previous jobs. This regressed the fix for #114
  // ("keep unauthenticated user logged in if allowed", bc4ad49) in 538c5b6. Remove
  // `.failing` once root.tsx verifies an existing session first.
  test.failing("keeps an existing session", async () => {
    setEnv({ ALLOW_UNAUTHENTICATED: true });
    const user = await createUser();

    const response = await request("/", { cookies: { auth: user.token } });

    expect(setCookie(response, "auth")).toBeUndefined();
    expect(jobsOf(user.id)).toHaveLength(1);
  });
});
