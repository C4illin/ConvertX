import { describe, expect, test } from "bun:test";
import type { User } from "../../src/db/types";
import { db, FIRST_ACCOUNT, firstRun as recordedFirstRun, SECOND_ACCOUNT } from "./helpers/app";

// helpers/app.ts walks through the first run when it loads the pages (see the comment
// there); these tests check the recorded responses.
if (!recordedFirstRun) {
  throw new Error("The database already had accounts when helpers/app.ts loaded the pages");
}
const firstRun = recordedFirstRun;

function findUser(email: string) {
  return db.query("SELECT * FROM users WHERE email = ?").get(email) as User | null;
}

describe("first run", () => {
  test("shows the account setup form", () => {
    expect(firstRun.setup.status).toBe(200);
    expect(firstRun.setup.body).toContain("Welcome to ConvertX!");
    expect(firstRun.setup.body).toContain('action="/register"');
  });

  test("sends visitors of the login page to the setup", () => {
    expect(firstRun.login.status).toBe(302);
    expect(firstRun.login.location).toBe("/setup");
  });

  test("sends visitors of the home page to the setup", () => {
    expect(firstRun.home.status).toBe(302);
    expect(firstRun.home.location).toBe("/setup");
  });

  test("registers the first account although registration is closed", async () => {
    expect(firstRun.register.status).toBe(302);
    expect(firstRun.register.location).toBe("/");
    expect(firstRun.register.cookies.some((cookie) => cookie.startsWith("auth="))).toBe(true);

    const user = findUser(FIRST_ACCOUNT.email);
    expect(user).not.toBeNull();
    // the password is stored as a hash, never in plain text
    expect(user?.password).not.toBe(FIRST_ACCOUNT.password);
    expect(await Bun.password.verify(FIRST_ACCOUNT.password, user?.password ?? "")).toBe(true);
  });

  test("closes the setup once the first account exists", () => {
    expect(firstRun.setupAfterwards.status).toBe(302);
    expect(firstRun.setupAfterwards.location).toBe("/login");
  });

  test("closes the registration once the first account exists", () => {
    expect(firstRun.registerAfterwards.status).toBe(302);
    expect(firstRun.registerAfterwards.location).toBe("/login");
    expect(findUser(SECOND_ACCOUNT.email)).toBeNull();
  });
});
