import { afterEach, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import {
  app,
  createJob,
  createUser,
  db,
  request,
  resetEnv,
  setCookie,
  setEnv,
  signToken,
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

function rowFor(externalId: string) {
  return db.query("SELECT * FROM users WHERE external_id = ?").get(externalId) as {
    id: number;
    email: string;
    external_id: string;
  } | null;
}

function idFor(externalId: string): number {
  const row = rowFor(externalId);
  expect(row).not.toBeNull();
  return row!.id;
}

describe("SSO_ENABLED", () => {
  test("creates a users row from the identity header on first sight", async () => {
    setEnv(sso());
    const uidHex = uid();

    const response = await request("/", { headers: identity(uidHex, "alice") });

    expect(response.status).toBe(200);
    const row = rowFor(uidHex);
    expect(row).not.toBeNull();
    expect(row?.email).toBe("alice");
    // The proxy header is the whole identity: no local session is minted.
    expect(setCookie(response, "auth")).toBeUndefined();
    await response.text();
  });

  test("maps the same uid to the same user instead of creating a second row", async () => {
    setEnv(sso());
    const uidHex = uid();

    const first = await request("/", { headers: identity(uidHex, "alice") });
    const second = await request("/", { headers: identity(uidHex, "alice") });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await first.text();
    await second.text();

    const { count } = db
      .query("SELECT COUNT(*) AS count FROM users WHERE external_id = ?")
      .get(uidHex) as { count: number };
    expect(count).toBe(1);
  });

  test("gives a different uid a different user that cannot see the first user's jobs", async () => {
    setEnv(sso());
    const alice = uid();
    const bob = uid();

    const home = await request("/", { headers: identity(alice, "alice") });
    expect(home.status).toBe(200);
    await home.text();

    const aliceId = idFor(alice);
    const job = createJob(aliceId, { numFiles: 1 });

    const aliceHistory = await (
      await request("/history", { headers: identity(alice, "alice") })
    ).text();
    expect(aliceHistory).toContain(`id="job-row-${job}"`);

    const bobHistory = await (await request("/history", { headers: identity(bob, "bob") })).text();
    expect(bobHistory).not.toContain(`id="job-row-${job}"`);

    const bobId = idFor(bob);
    expect(bobId).not.toBe(aliceId);

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

  test("rejects a comma-joined duplicate header instead of minting a new identity", async () => {
    setEnv(sso());
    const real = uid();
    const before = db.query("SELECT COUNT(*) AS count FROM users").get() as { count: number };

    const response = await request("/", {
      headers: identity(`${real}, ${uid()}`, "alice"),
    });

    expect(response.status).toBe(401);
    const after = db.query("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    expect(after.count).toBe(before.count);
  });

  test("does not authenticate a session cookie without the identity header", async () => {
    setEnv(sso());
    const local = await createUser();

    // A JWT minted before SSO_ENABLED was switched on must not survive it.
    const token = await signToken(local.id);
    const page = await request("/", {
      headers: { accept: "text/html", cookie: `auth=${token}` },
    });

    expect(page.status).toBe(401);
  });

  test("guards every auth:true route with the header, not the cookie", async () => {
    setEnv(sso());
    const local = await createUser();
    const token = await signToken(local.id);
    const job = createJob(local.id, { numFiles: 1 });

    const guarded: [string, string, string | undefined][] = [
      ["GET", "/history", undefined],
      ["GET", "/converters", undefined],
      ["GET", "/account", undefined],
      ["GET", `/results/${job}`, undefined],
      ["GET", `/archive/${job}`, undefined],
      ["GET", `/download/${local.id}/${job}/a.txt`, undefined],
      ["POST", `/delete/${job}`, undefined],
      ["POST", "/delete-multiple", JSON.stringify({ jobIds: [String(job)] })],
      ["POST", `/progress/${job}`, undefined],
      ["POST", "/delete", JSON.stringify({ filename: "a.txt" })],
      ["POST", "/convert", JSON.stringify({ convert_to: "pdf", file_names: "a.txt" })],
    ];

    for (const [method, path, body] of guarded) {
      const response = await request(path, {
        method,
        headers: {
          accept: "text/html",
          cookie: `auth=${token}`,
          "content-type": "application/json",
        },
        body,
      });

      expect(`${method} ${path} -> ${response.status}`).toBe(`${method} ${path} -> 401`);
      await response.text();
    }

    // the guard ran before the handler: nothing was deleted
    expect(db.query("SELECT id FROM jobs WHERE id = ?").get(job)).not.toBeNull();

    // /upload takes multipart, so it is exercised with a real form body.
    const form = new FormData();
    form.append("file", new File(["x"], "x.txt"));
    const upload = await app.handle(
      new Request("http://localhost/upload", {
        method: "POST",
        headers: { cookie: `auth=${token}` },
        body: form,
      }),
    );
    expect(upload.status).toBe(401);
    await upload.text();
  });

  test("lets the identity header win over a session cookie of another user", async () => {
    setEnv(sso());
    const local = await createUser();
    const token = await signToken(local.id);
    const bob = uid();

    const account = await request("/account", {
      cookies: { auth: token },
      headers: identity(bob, "bob"),
    });
    const body = await account.text();

    expect(account.status).toBe(200);
    expect(body).toContain("bob");
    expect(body).not.toContain(local.email);
    expect(setCookie(account, "auth")).toBeUndefined();
  });

  test("escapes the username on the account page", async () => {
    setEnv(sso());
    const payload = `<img src=x onerror=alert(1)>`;

    const response = await request("/account", { headers: identity(uid(), payload) });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain(payload);
    expect(body).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  test("rejects a cross-site state-changing request", async () => {
    setEnv(sso());
    const alice = uid();

    const home = await request("/", { headers: identity(alice, "alice") });
    await home.text();
    const job = createJob(idFor(alice), { numFiles: 1 });

    const response = await request(`/delete/${job}`, {
      method: "POST",
      headers: { ...identity(alice, "alice"), origin: "https://evil.example" },
    });

    expect(response.status).toBe(403);
    expect(db.query("SELECT id FROM jobs WHERE id = ?").get(job)).not.toBeNull();

    // same-origin POST still works
    const sameOrigin = await request(`/delete/${job}`, {
      method: "POST",
      headers: { ...identity(alice, "alice"), origin: "http://localhost" },
    });
    expect(sameOrigin.status).toBe(302);
    expect(db.query("SELECT id FROM jobs WHERE id = ?").get(job)).toBeNull();
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
    expect(body).toContain(String(idFor(uidHex)));
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
    expect(rowFor(uidHex)).toBeNull();
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
