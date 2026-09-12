import { expect, test } from "bun:test";
import { Elysia } from "elysia";
import { isHtmlPageRequest } from "../../src/helpers/isHtmlPageRequest";
import { userService } from "../../src/services/user";

const app = new Elysia()
  .use(userService)
  .get("/protected", () => "protected", { auth: true })
  .post("/protected", () => "protected", { auth: true });

test("identifies HTML page navigation requests", () => {
  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        headers: { accept: "text/html" },
      }),
    ),
  ).toBe(true);

  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        headers: { accept: "TEXT/HTML" },
      }),
    ),
  ).toBe(true);

  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        method: "HEAD",
        headers: { accept: "text/html,application/xhtml+xml" },
      }),
    ),
  ).toBe(true);
});

test("does not identify API requests as HTML page navigation", () => {
  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        method: "POST",
        headers: { accept: "text/html" },
      }),
    ),
  ).toBe(false);

  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        headers: { accept: "application/json" },
      }),
    ),
  ).toBe(false);

  expect(
    isHtmlPageRequest(
      new Request("http://localhost/protected", {
        headers: { accept: "*/*" },
      }),
    ),
  ).toBe(false);
});

test("redirects unauthorized HTML requests to login", async () => {
  const response = await app.handle(
    new Request("http://localhost/protected", {
      headers: { accept: "text/html" },
      redirect: "manual",
    }),
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/login");
});

test("returns JSON 401 for unauthorized API requests", async () => {
  const response = await app.handle(
    new Request("http://localhost/protected", {
      method: "POST",
      headers: { accept: "application/json" },
    }),
  );

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ success: false, message: "Unauthorized" });
});
