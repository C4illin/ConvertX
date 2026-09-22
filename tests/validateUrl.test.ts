import { expect, test, describe } from "bun:test";
import { validateSafeUrl } from "../src/helpers/validateUrl";

describe("validateSafeUrl", () => {
  test("allows valid HTTP and HTTPS URLs", () => {
    expect(() => validateSafeUrl("https://example.com/cat.jpg")).not.toThrow();
    expect(() => validateSafeUrl("http://example.com/image.png")).not.toThrow();
  });

  test("allows local IP and LAN addresses for self-hosted usage", () => {
    expect(() => validateSafeUrl("http://localhost:3000/test.jpg")).not.toThrow();
    expect(() => validateSafeUrl("http://192.168.1.50/file.png")).not.toThrow();
    expect(() => validateSafeUrl("http://10.0.0.5/doc.pdf")).not.toThrow();
    expect(() => validateSafeUrl("http://nas.local/data.zip")).not.toThrow();
  });

  test("rejects non-http/https protocols", () => {
    expect(() => validateSafeUrl("file:///etc/passwd")).toThrow(
      "Only HTTP and HTTPS URLs are supported",
    );
    expect(() => validateSafeUrl("ftp://example.com/file")).toThrow(
      "Only HTTP and HTTPS URLs are supported",
    );
    expect(() => validateSafeUrl("gopher://example.com")).toThrow(
      "Only HTTP and HTTPS URLs are supported",
    );
    expect(() => validateSafeUrl("javascript:alert(1)")).toThrow(
      "Only HTTP and HTTPS URLs are supported",
    );
  });

  test("rejects invalid URL formats", () => {
    expect(() => validateSafeUrl("not-a-url")).toThrow("Invalid URL format");
    expect(() => validateSafeUrl("://bad.url")).toThrow("Invalid URL format");
  });
});
