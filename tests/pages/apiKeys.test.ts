import { afterEach, describe, expect, test } from "bun:test";

import { createUser, db, request, resetEnv, setEnv, signToken } from "./helpers/app";

afterEach(() => {
  resetEnv();
});

// A whole key; the list only shows its first few characters.
const FULL_KEY = /cvx_[\w-]{20,}/;

function keyCount(userId: number | string) {
  return (
    db.query("SELECT count(*) AS n FROM api_keys WHERE user_id = ?").get(userId) as {
      n: number;
    }
  ).n;
}

describe("API keys page", () => {
  test("shows a new key once, so reloading doesn't create another", async () => {
    const user = await createUser();
    const cookies = { auth: user.token };

    const created = await request("/account/api-keys", { cookies, form: { name: "n8n" } });
    expect(created.status).toBe(303);
    expect(created.headers.get("location")).toBe("/account/api-keys");

    const first = await (await request("/account/api-keys", { cookies })).text();
    expect(first).toContain("Copy your new key now");
    expect(first).toMatch(FULL_KEY);

    const reloaded = await (await request("/account/api-keys", { cookies })).text();
    expect(reloaded).not.toMatch(FULL_KEY);
    expect(keyCount(user.id)).toBe(1);
  });

  test("shows dates in the configured language and time zone", async () => {
    setEnv({ LANGUAGE: "de", TIMEZONE: "Asia/Tokyo" });
    const user = await createUser();
    await request("/account/api-keys", { cookies: { auth: user.token }, form: { name: "script" } });
    const { date_created } = db
      .query("SELECT date_created FROM api_keys WHERE user_id = ?")
      .get(user.id) as { date_created: string };

    const page = await (
      await request("/account/api-keys", { cookies: { auth: user.token } })
    ).text();

    expect(page).toContain(new Date(date_created).toLocaleString("de", { timeZone: "Asia/Tokyo" }));
  });

  test("is only for registered accounts, not anonymous sessions", async () => {
    // ALLOW_UNAUTHENTICATED gives visitors a signed id that has no account; with
    // UNAUTHENTICATED_USER_SHARING they all share id 0.
    for (const id of [2 ** 24 + 5, 0]) {
      const cookies = { auth: await signToken(id) };
      for (const response of [
        await request("/account/api-keys", { cookies }),
        await request("/account/api-keys", { cookies, form: { name: "anonymous" } }),
      ]) {
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/");
      }
      expect(keyCount(id)).toBe(0);
    }
  });
});
