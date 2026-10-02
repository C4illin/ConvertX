import { describe, expect, test } from "bun:test";
import { request } from "./helpers/app";

describe("GET /healthcheck", () => {
  test("reports ok without a session", async () => {
    const response = await request("/healthcheck");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("ignores an invalid session", async () => {
    const response = await request("/healthcheck", { cookies: { auth: "not-a-jwt" } });

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
