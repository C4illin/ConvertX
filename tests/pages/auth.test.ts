import { expect, test } from "bun:test";
import { isHtmlPageRequest } from "../../src/helpers/isHtmlPageRequest";

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
