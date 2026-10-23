import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { WEBROOT } from "../../src/helpers/env";
import { userService } from "../../src/services/user";

let protectedHandlerCalls = 0;

const app = new Elysia()
  .use(userService)
  .get(
    "/me",
    ({ user }) => {
      protectedHandlerCalls++;
      return user;
    },
    { auth: true },
  )
  .post("/me", ({ user }) => user, { auth: true })
  .get("/public", () => "public")
  .post("/sign-in", ({ body }) => body, { body: "signIn" })
  .get("/session", ({ cookie: { auth, jobId } }) => ({ auth: auth.value, jobId: jobId.value }), {
    cookie: "session",
  });

const signer = app.decorator.jwt;

// tokens the service must reject
const foreignToken = await new Elysia()
  .use(jwt({ name: "jwt", secret: randomUUID() }))
  .decorator.jwt.sign({ id: "42" });
const expiredToken = await signer.sign({ id: "42", exp: Math.floor(Date.now() / 1000) - 60 });
// payload violates the { id: string } schema
const wrongSchemaToken = await signer.sign({ id: 42 as unknown as string });

function request(path: string, init: RequestInit & { cookie?: string } = {}) {
  const { cookie, headers, ...rest } = init;
  return app.handle(
    new Request(`http://localhost${path}`, {
      ...rest,
      headers: { ...(cookie ? { cookie } : {}), ...headers },
    }),
  );
}

const htmlPage = { accept: "text/html" };
const apiCall = { accept: "application/json" };

function expectAuthCookieCleared(response: Response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  expect(setCookie).toMatch(/^auth=;/);
  expect(setCookie).toContain("Max-Age=0");
}

describe("auth macro with a valid token", () => {
  test("resolves the token payload as user", async () => {
    const token = await signer.sign({ id: "42" });

    const response = await request("/me", { cookie: `auth=${token}` });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "42" });
  });

  test("issues tokens that expire after seven days", async () => {
    const token = await signer.sign({ id: "42" });

    const user = (await (await request("/me", { cookie: `auth=${token}` })).json()) as {
      exp: number;
      iat: number;
    };

    expect(user.exp - user.iat).toBe(7 * 24 * 60 * 60);
  });

  test("accepts an optional jobId cookie", async () => {
    const token = await signer.sign({ id: "42" });

    const response = await request("/me", { cookie: `auth=${token}; jobId=7` });

    expect(response.status).toBe(200);
  });

  test("does not touch the auth cookie", async () => {
    const token = await signer.sign({ id: "42" });

    const response = await request("/me", { cookie: `auth=${token}` });

    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("auth macro without a token", () => {
  test("redirects HTML page requests to the login page", async () => {
    const response = await request("/me", { headers: htmlPage, redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${WEBROOT}/login`);
    expect(await response.json()).toEqual({ success: false, message: "Redirecting to login" });
  });

  test("redirects HEAD page requests to the login page", async () => {
    const response = await request("/me", { method: "HEAD", headers: htmlPage });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${WEBROOT}/login`);
  });

  test("returns 401 JSON for API requests", async () => {
    const response = await request("/me", { headers: apiCall });

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({ success: false, message: "Unauthorized" });
  });

  test("returns 401 for non-GET requests even if they accept HTML", async () => {
    const response = await request("/me", { method: "POST", headers: htmlPage });

    expect(response.status).toBe(401);
  });

  test("treats an empty auth cookie as missing", async () => {
    const response = await request("/me", { cookie: "auth=", headers: htmlPage });

    expect(response.status).toBe(302);
    // there is no session to clear
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  test("does not run the protected handler", async () => {
    const callsBefore = protectedHandlerCalls;

    await request("/me", { headers: apiCall });
    await request("/me", { headers: htmlPage });

    expect(protectedHandlerCalls).toBe(callsBefore);
  });
});

describe("auth macro with an invalid token", () => {
  test.each([
    ["a malformed token", "not-a-jwt"],
    ["a token signed with another secret", foreignToken],
    ["an expired token", expiredToken],
    ["a token whose payload does not match the schema", wrongSchemaToken],
  ])("rejects %s and clears the auth cookie", async (_, token) => {
    const response = await request("/me", { cookie: `auth=${token}`, headers: apiCall });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, message: "Unauthorized" });
    expectAuthCookieCleared(response);
  });

  test("redirects HTML page requests to login and clears the auth cookie", async () => {
    const response = await request("/me", { cookie: "auth=not-a-jwt", headers: htmlPage });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${WEBROOT}/login`);
    expectAuthCookieCleared(response);
  });
});

describe("routes without auth", () => {
  test("are reachable without a token", async () => {
    const response = await request("/public", { headers: htmlPage });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("public");
  });
});

describe("models", () => {
  const postJson = (body: unknown) =>
    request("/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  test("signIn accepts an email and a password", async () => {
    const response = await postJson({ email: "user@example.com", password: "secret" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "user@example.com", password: "secret" });
  });

  test.each([
    ["the password is missing", { email: "user@example.com" }],
    ["the email is missing", { password: "secret" }],
    ["the email is not a string", { email: 42, password: "secret" }],
  ])("signIn rejects the body when %s", async (_, body) => {
    const response = await postJson(body);

    expect(response.status).toBe(422);
  });

  test("session requires an auth cookie", async () => {
    const response = await request("/session", { cookie: "jobId=3" });

    expect(response.status).toBe(422);
  });

  test("session accepts an auth cookie with an optional jobId", async () => {
    const withJob = await request("/session", { cookie: "auth=token; jobId=3" });
    const withoutJob = await request("/session", { cookie: "auth=token" });

    expect(await withJob.json()).toEqual({ auth: "token", jobId: "3" });
    expect(await withoutJob.json()).toEqual({ auth: "token" });
  });
});
