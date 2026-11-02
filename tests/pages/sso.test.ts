import { afterEach, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { ssoIdForUid } from "../../src/helpers/sso";
import {
  app,
  createJob,
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

const uid = () => randomBytes(32).toString("hex");

/** SSO with local accounts and anonymous access turned off, as deployed. */
const sso = () => ({ SSO_ENABLED: true, ALLOW_UNAUTHENTICATED: false });

function identity(uidHex: string, username: string, extra: Record<string, string> = {}) {
  return { "x-authentik-uid": uidHex, "x-authentik-username": username, ...extra };
}

describe("SSO_ENABLED", () => {
  test("creates a users row from the identity header on first sight", async () => {
    setEnv(sso());
    const uidHex = uid();
    const id = ssoIdForUid(uidHex) as number;

    const response = await request("/", { headers: identity(uidHex, "alice") });

    expect(response.status).toBe(200);
    const row = db.query("SELECT * FROM users WHERE id = ?").get(id) as { email: string } | null;
    expect(row).not.toBeNull();
    expect(row?.email).toBe("alice");
    // and the browser gets a JWT session for the following requests
    expect(setCookieValue(response, "auth")).toBeString();
  });

  test("maps the same uid to the same user instead of creating a second row", async () => {
    setEnv(sso());
    const uidHex = uid();
    const id = ssoIdForUid(uidHex) as number;

    const first = await request("/", { headers: identity(uidHex, "alice") });
    const second = await request("/", { headers: identity(uidHex, "alice") });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const firstId = (await app.decorator.jwt.verify(setCookieValue(first, "auth") ?? "")) as {
      id: string;
    };
    const secondId = (await app.decorator.jwt.verify(setCookieValue(second, "auth") ?? "")) as {
      id: string;
    };
    expect(firstId?.id).toBe(String(id));
    expect(secondId?.id).toBe(String(id));

    const { count } = db
      .query("SELECT COUNT(*) AS count FROM users WHERE id = ?")
      .get(id) as { count: number };
    expect(count).toBe(1);
  });

  test("gives a different uid a different user that cannot see the first user's jobs", async () => {
    setEnv(sso());
    const alice = uid();
    const bob = uid();
    const aliceId = ssoIdForUid(alice) as number;

    const home = await request("/", { headers: identity(alice, "alice") });
    expect(home.status).toBe(200);

    // the home page creates an empty job; the history only lists jobs with files
    const job = createJob(aliceId, { numFiles: 1 });

    const aliceHistory = await (
      await request("/history", { headers: identity(alice, "alice") })
    ).text();
    expect(aliceHistory).toContain(`id="job-row-${job}"`);

    const bobId = ssoIdForUid(bob) as number;
    expect(bobId).not.toBe(aliceId);

    const bobHistory = await (await request("/history", { headers: identity(bob, "bob") })).text();
    expect(bobHistory).not.toContain(`id="job-row-${job}"`);

    // a job created directly for alice is invisible to bob as well
    const direct = createJob(aliceId, { numFiles: 1 });
    const bobAgain = await (await request("/history", { headers: identity(bob, "bob") })).text();
    expect(bobAgain).not.toContain(`id="job-row-${direct}"`);
  });

  test("rejects a request without the identity header", async () => {
    setEnv(sso());

    const page = await request("/", { headers: { accept: "text/html" } });
    expect(page.status).toBe(401);
    expect(page.headers.get("location")).toBeNull();

    const api = await request("/history");
    expect(api.status).toBe(401);
  });

  test("rejects an empty identity header", async () => {
    setEnv(sso());

    const response = await request("/", { headers: { "x-authentik-uid": "" } });

    expect(response.status).toBe(401);
  });

  test("lets the identity header win over a session cookie of another user", async () => {
    setEnv(sso());
    const alice = uid();
    const bob = uid();

    const aliceHome = await request("/", { headers: identity(alice, "alice") });
    const aliceToken = setCookieValue(aliceHome, "auth") as string;
    await aliceHome.text();

    const account = await request("/account", {
      cookies: { auth: aliceToken },
      headers: identity(bob, "bob"),
    });
    const body = await account.text();

    expect(account.status).toBe(200);
    expect(body).toContain("bob");
    expect(body).not.toContain("alice");
    expect(setCookieValue(account, "auth")).not.toBe(aliceToken);
  });

  test("disables the local login, setup and register routes", async () => {
    setEnv(sso());

    for (const path of ["/login", "/setup", "/register"]) {
      const response = await request(path, { headers: { accept: "text/html" } });
      expect(response.status).toBe(404);
    }

    const login = await request("/login", {
      form: { email: "alice", password: "whatever" },
    });
    expect(login.status).toBe(404);
  });

  test("shows the read-only SSO identity on the account page", async () => {
    setEnv(sso());
    const uidHex = uid();

    const response = await request("/account", { headers: identity(uidHex, "alice") });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("alice");
    expect(body).toContain(String(ssoIdForUid(uidHex)));
    expect(body).not.toContain('name="newPassword"');
  });
});

describe("SSO_ENABLED=false", () => {
  test("keeps redirecting to the login page and ignores the header", async () => {
    setEnv({ SSO_ENABLED: false, ALLOW_UNAUTHENTICATED: false });
    const uidHex = uid();

    const response = await request("/", { headers: identity(uidHex, "alice-after-sso") });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(db.query("SELECT id FROM users WHERE email = ?").get("alice-after-sso")).toBeNull();
  });

  test("keeps the login and setup routes reachable", async () => {
    setEnv({ SSO_ENABLED: false, ALLOW_UNAUTHENTICATED: false });

    const login = await request("/login", { headers: { accept: "text/html" } });
    expect(login.status).toBe(200);
    expect(await login.text()).toContain('name="password"');

    // /setup redirects once the first account exists
    const setup = await request("/setup");
    expect(setup.status).toBe(302);
    expect(setup.headers.get("location")).toBe("/login");
  });

  test("does not issue a session cookie for a header-only request", async () => {
    setEnv({ SSO_ENABLED: false, ALLOW_UNAUTHENTICATED: false });

    const response = await request("/history", { headers: identity(uid(), "nobody") });

    expect(response.status).toBe(401);
    expect(setCookie(response, "auth")).toBeUndefined();
  });
});
