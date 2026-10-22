import { mock } from "bun:test";
import { html } from "@elysiajs/html";
import { Elysia } from "elysia";
import * as realEnvModule from "../../../src/helpers/env";

if (!process.env.CONVERTX_TEST_ROOT) {
  // Without tests/preload.ts the pages would import src/index.tsx (starting the server)
  // and write into ./data next to real conversions.
  throw new Error("Page tests must run via `bun test` so that tests/preload.ts is loaded.");
}

// dynamic imports ensure that the guard above runs before any page module is loaded
const { default: db } = await import("../../../src/db/db");
const { uploadsDir, outputDir } = await import("../../../src/index");
const userPage = await import("../../../src/pages/user");
const { root } = await import("../../../src/pages/root");
const { upload } = await import("../../../src/pages/upload");
const { history } = await import("../../../src/pages/history");
const { convert } = await import("../../../src/pages/convert");
const { download } = await import("../../../src/pages/download");
const { deleteJob } = await import("../../../src/pages/deleteJob");
const { results } = await import("../../../src/pages/results");
const { deleteFile } = await import("../../../src/pages/deleteFile");
const { listConverters } = await import("../../../src/pages/listConverters");
const { chooseConverter } = await import("../../../src/pages/chooseConverter");
const { healthcheck } = await import("../../../src/pages/healthcheck");

export { db, uploadsDir };

// Same composition as src/index.tsx, without the server, static files and job cleanup.
export const app = new Elysia({ prefix: realEnvModule.WEBROOT })
  .use(html())
  .use(userPage.user)
  .use(root)
  .use(upload)
  .use(history)
  .use(convert)
  .use(download)
  .use(deleteJob)
  .use(results)
  .use(deleteFile)
  .use(listConverters)
  .use(chooseConverter)
  .use(healthcheck);

// --- environment flags ---------------------------------------------------------
// src/helpers/env.ts reads process.env once at import, so flags are switched by
// re-mocking the module; importers see the new values through their live bindings.
type Env = typeof realEnvModule;
const realEnv: Env = { ...realEnvModule };

export function setEnv(overrides: Partial<Env>) {
  mock.module("../../../src/helpers/env", () => ({ ...realEnv, ...overrides }));
}

export function resetEnv() {
  mock.module("../../../src/helpers/env", () => realEnv);
}

// --- requests --------------------------------------------------------------------
type RequestOptions = {
  method?: string;
  cookies?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  json?: unknown;
  form?: Record<string, string>;
  body?: RequestInit["body"];
};

export function request(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { ...options.headers };
  let body = options.body;

  const cookie = Object.entries(options.cookies ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (cookie) headers.cookie = cookie;

  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(options.form).toString();
  }

  return app.handle(
    new Request(`http://localhost${path}`, {
      method: options.method ?? (body === undefined ? "GET" : "POST"),
      headers,
      body,
    }),
  );
}

/** Returns the Set-Cookie header for one cookie, or undefined if it was not set. */
export function setCookie(response: Response, name: string) {
  return response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${name}=`));
}

/** Extracts the value of a cookie set by the response. */
export function setCookieValue(response: Response, name: string) {
  return setCookie(response, name)
    ?.split(";")[0]
    ?.slice(name.length + 1);
}

// --- users and jobs --------------------------------------------------------------
let userCounter = 0;

export type TestUser = { id: number; email: string; password: string; token: string };

export async function signToken(id: number | string) {
  return app.decorator.jwt.sign({ id: String(id) });
}

/** Creates a user directly in the database, bypassing the registration rules. */
export async function createUser(password = "correct horse battery staple"): Promise<TestUser> {
  const email = `user${++userCounter}-${crypto.randomUUID()}@example.com`;
  const { id } = db
    .query("INSERT INTO users (email, password) VALUES (?, ?) RETURNING id")
    .get(email, await Bun.password.hash(password)) as { id: number };

  return { id, email, password, token: await signToken(id) };
}

type FileRow = { file_name: string; output_file_name: string; status: string };

export function createJob(
  userId: number | string,
  { numFiles = 0, status = "not started", files = [] as FileRow[] } = {},
) {
  const { id } = db
    .query(
      "INSERT INTO jobs (user_id, date_created, num_files, status) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .get(userId, new Date().toISOString(), numFiles, status) as { id: number };

  for (const file of files) {
    db.query(
      "INSERT INTO file_names (job_id, file_name, output_file_name, status) VALUES (?, ?, ?, ?)",
    ).run(id, file.file_name, file.output_file_name, file.status);
  }

  return id;
}

export function jobDirs(userId: number | string, jobId: number | string) {
  return {
    uploads: `${uploadsDir}${userId}/${jobId}/`,
    output: `${outputDir}${userId}/${jobId}/`,
  };
}

/** Polls until the condition holds, e.g. for conversions that run in the background. */
export async function waitFor(condition: () => boolean, timeoutMs = 5000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs} ms`);
    }
    await Bun.sleep(10);
  }
}

// --- first run -------------------------------------------------------------------
// FIRST_RUN is computed once when src/pages/user.tsx is loaded and only flips back when
// the first account is registered. Until then almost every page redirects to /setup.
// Walk through the setup once, like a fresh installation, and keep the responses for
// tests/pages/firstRun.test.ts; every other test then starts from a configured instance.
type Snapshot = { status: number; location: string | null; cookies: string[]; body: string };

async function snapshot(response: Promise<Response>): Promise<Snapshot> {
  const { status, headers } = await response;
  return {
    status,
    location: headers.get("location"),
    cookies: headers.getSetCookie(),
    body: await (await response).text(),
  };
}

export const FIRST_ACCOUNT = { email: "first@example.com", password: crypto.randomUUID() };
export const SECOND_ACCOUNT = { email: "second@example.com", password: crypto.randomUUID() };

async function walkThroughFirstRun() {
  // the first account must not depend on open registration
  setEnv({ ACCOUNT_REGISTRATION: false });
  try {
    return {
      setup: await snapshot(request("/setup")),
      login: await snapshot(request("/login")),
      home: await snapshot(request("/")),
      register: await snapshot(request("/register", { form: FIRST_ACCOUNT })),
      setupAfterwards: await snapshot(request("/setup")),
      registerAfterwards: await snapshot(request("/register", { form: SECOND_ACCOUNT })),
    };
  } finally {
    resetEnv();
  }
}

export const firstRun = userPage.FIRST_RUN ? await walkThroughFirstRun() : undefined;

if (userPage.FIRST_RUN) {
  throw new Error("Registering the first account did not complete the first run");
}
