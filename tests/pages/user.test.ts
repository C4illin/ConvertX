import { afterEach, describe, expect, test } from "bun:test";
import type { User } from "../../src/db/types";
import {
  app,
  createUser,
  db,
  request,
  resetEnv,
  setCookie,
  setCookieValue,
  setEnv,
  signToken,
} from "./helpers/app";

afterEach(() => {
  resetEnv();
});

function findUser(email: string) {
  return db.query("SELECT * FROM users WHERE email = ?").get(email) as User | null;
}

function findUserById(id: number) {
  return db.query("SELECT * FROM users WHERE id = ?").get(id) as User | null;
}

const uniqueEmail = () => `${crypto.randomUUID()}@example.com`;

describe("GET /register", () => {
  test("redirects to the login page while registration is closed", async () => {
    setEnv({ ACCOUNT_REGISTRATION: false });

    const response = await request("/register");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("shows the registration form when registration is open", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true });

    const response = await request("/register");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('value="Register"');
  });
});

describe("POST /register", () => {
  test("does not create an account while registration is closed", async () => {
    setEnv({ ACCOUNT_REGISTRATION: false });
    const email = uniqueEmail();

    const response = await request("/register", { form: { email, password: "secret" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(findUser(email)).toBeNull();
  });

  test("creates the account, logs it in and redirects home when registration is open", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true });
    const email = uniqueEmail();

    const response = await request("/register", { form: { email, password: "secret" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");

    const user = findUser(email);
    expect(user).not.toBeNull();
    expect(await Bun.password.verify("secret", user?.password ?? "")).toBe(true);

    const token = setCookieValue(response, "auth") ?? "";
    expect(await app.decorator.jwt.verify(token)).toMatchObject({ id: String(user?.id) });
    expect(setCookie(response, "auth")).toContain("HttpOnly");
    expect(setCookie(response, "auth")).toContain("Secure");
    expect(setCookie(response, "auth")).toContain("SameSite=Strict");
    expect(setCookie(response, "auth")).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });

  test("omits the Secure cookie flag when plain HTTP is allowed", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true, HTTP_ALLOWED: true });

    const response = await request("/register", {
      form: { email: uniqueEmail(), password: "secret" },
    });

    expect(setCookie(response, "auth")).not.toContain("Secure");
  });

  test("rejects an email that is already registered", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true });
    const existing = await createUser();

    const response = await request("/register", {
      form: { email: existing.email, password: "another password" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Email already in use." });
    // the existing account keeps its password
    expect(
      await Bun.password.verify(existing.password, findUser(existing.email)?.password ?? ""),
    ).toBe(true);
  });

  test("rejects a request without a password", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true });

    const response = await request("/register", { form: { email: uniqueEmail() } });

    expect(response.status).toBe(422);
  });
});

const expectErrorPage = async (response: Response, message: string) => {
  expect(response.headers.get("content-type")).toContain("text/html");
  const body = await response.text();
  expect(body).toContain('role="alert"');
  expect(body).toContain(message);
};
describe("GET /login", () => {
  test("shows the login form without a register link while registration is closed", async () => {
    setEnv({ ACCOUNT_REGISTRATION: false });

    const body = await (await request("/login")).text();

    expect(body).toContain('value="Login"');
    expect(body).not.toContain('href="/register"');
  });

  test("links to the registration when it is open", async () => {
    setEnv({ ACCOUNT_REGISTRATION: true });

    const body = await (await request("/login")).text();

    expect(body).toContain('href="/register"');
  });

  test("redirects users that are already logged in to the home page", async () => {
    const user = await createUser();

    const response = await request("/login", { cookies: { auth: user.token } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });

  test("clears an invalid session and shows the login form", async () => {
    const response = await request("/login", { cookies: { auth: "not-a-jwt" } });

    expect(response.status).toBe(200);
    expect(setCookie(response, "auth")).toContain("Max-Age=0");
  });
});

describe("POST /login", () => {
  test("logs in with valid credentials and redirects home", async () => {
    const user = await createUser();

    const response = await request("/login", {
      form: { email: user.email, password: user.password },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    const token = setCookieValue(response, "auth") ?? "";
    expect(await app.decorator.jwt.verify(token)).toMatchObject({ id: String(user.id) });
    expect(setCookie(response, "auth")).toContain("HttpOnly");
  });

  test.each([
    ["the password is wrong", "wrong password"],
    ["the password is empty", ""],
  ])("rejects the login when %s", async (_, password) => {
    const user = await createUser();

    const response = await request("/login", { form: { email: user.email, password } });

    expect(response.status).toBe(403);
    await expectErrorPage(response, "Invalid credentials.");
    expect(setCookie(response, "auth")).toBeUndefined();
  });

  test("gives the same answer for unknown emails, so accounts cannot be enumerated", async () => {
    const response = await request("/login", {
      form: { email: uniqueEmail(), password: "whatever" },
    });

    expect(response.status).toBe(403);
    await expectErrorPage(response, "Invalid credentials.");
  });

  test("keeps the entered email in the form after a failed login", async () => {
    const user = await createUser();

    const response = await request("/login", {
      form: { email: user.email, password: "wrong password" },
    });

    expect(await response.text()).toContain(`value="${user.email}"`);
  });

  test("rejects a request without a password", async () => {
    const user = await createUser();

    const response = await request("/login", { form: { email: user.email } });

    expect(response.status).toBe(422);
  });
});

describe.each(["GET", "POST"])("%s /logoff", (method) => {
  test("clears the session and redirects to the login page", async () => {
    const user = await createUser();

    const response = await request("/logoff", { method, cookies: { auth: user.token } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(setCookie(response, "auth")).toContain("Max-Age=0");
  });

  test("redirects to the login page without a session", async () => {
    const response = await request("/logoff", { method });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(setCookie(response, "auth")).toBeUndefined();
  });
});

describe("GET /account", () => {
  test("redirects to the login page without a session", async () => {
    const response = await request("/account", { headers: { accept: "text/html" } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("shows the account form with the current email", async () => {
    const user = await createUser();

    const response = await request("/account", { cookies: { auth: user.token } });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`value="${user.email}"`);
  });

  test("redirects home when the account no longer exists", async () => {
    const response = await request("/account", { cookies: { auth: await signToken(999_999) } });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
  });
});

describe("POST /account", () => {
  const updateAccount = (
    token: string,
    form: { email?: string; newPassword?: string; password: string },
  ) =>
    request("/account", {
      cookies: { auth: token },
      form: { email: "", newPassword: "", ...form },
    });

  test("rejects the update when the current password is wrong", async () => {
    const user = await createUser();

    const response = await updateAccount(user.token, {
      email: uniqueEmail(),
      password: "wrong password",
    });

    expect(response.status).toBe(403);
    await expectErrorPage(response, "Invalid credentials.");
    expect(findUserById(user.id)?.email).toBe(user.email);
  });

  test("changes the email", async () => {
    const user = await createUser();
    const newEmail = uniqueEmail();

    const response = await updateAccount(user.token, { email: newEmail, password: user.password });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(findUserById(user.id)?.email).toBe(newEmail);
  });

  test("allows submitting the unchanged email", async () => {
    const user = await createUser();

    const response = await updateAccount(user.token, {
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(302);
    expect(findUserById(user.id)?.email).toBe(user.email);
  });

  test("refuses an email that belongs to another account", async () => {
    const user = await createUser();
    const other = await createUser();

    const response = await updateAccount(user.token, {
      email: other.email,
      password: user.password,
    });

    expect(response.status).toBe(409);
    await expectErrorPage(response, "Email already in use.");
    expect(findUserById(user.id)?.email).toBe(user.email);
  });

  test("changes the password", async () => {
    const user = await createUser();

    await updateAccount(user.token, { newPassword: "new password", password: user.password });

    const login = await request("/login", {
      form: { email: user.email, password: "new password" },
    });
    expect(login.status).toBe(302);
    const oldLogin = await request("/login", {
      form: { email: user.email, password: user.password },
    });
    expect(oldLogin.status).toBe(403);
  });

  test("keeps everything unchanged when email and new password are left blank", async () => {
    const user = await createUser();
    const before = findUserById(user.id);

    const response = await updateAccount(user.token, { password: user.password });

    expect(response.status).toBe(302);
    expect(findUserById(user.id)).toEqual(before);
  });

  test("requires a session cookie", async () => {
    const response = await request("/account", {
      form: { email: "", newPassword: "", password: "secret" },
    });

    expect(response.status).toBe(422);
  });

  test("redirects to the login page for an invalid session", async () => {
    const response = await updateAccount("not-a-jwt", { password: "secret" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("clears the session of an account that no longer exists", async () => {
    const response = await updateAccount(await signToken(999_999), { password: "secret" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(setCookie(response, "auth")).toContain("Max-Age=0");
  });
});
