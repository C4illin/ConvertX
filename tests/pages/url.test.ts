import { expect, test, describe } from "bun:test";
import { getFilename } from "../../src/helpers/getFilename";

describe("getFilename", () => {
  test("extracts filename from simple URL", () => {
    const headers = new Headers();
    const result = getFilename("https://example.com/cat.jpg", headers);
    expect(result).toBe("cat.jpg");
  });

  test("extracts filename from Content-Disposition header", () => {
    const headers = new Headers({
      "Content-Disposition": 'attachment; filename="cute-dog.png"',
    });
    const result = getFilename("https://example.com/download?id=123", headers);
    expect(result).toBe("cute-dog.png");
  });

  test("extracts RFC 5987 encoded filename from Content-Disposition header", () => {
    const headers = new Headers({
      "Content-Disposition": "attachment; filename*=UTF-8''my%20document.pdf",
    });
    const result = getFilename("https://example.com/file", headers);
    expect(result).toBe("my document.pdf");
  });

  test("appends MIME extension when filename has no extension", () => {
    const headers = new Headers({
      "Content-Type": "image/png",
    });
    const result = getFilename("https://example.com/myimage", headers);
    expect(result).toBe("myimage.png");
  });

  test("generates fallback filename when remote supplies empty or all-dot filename", () => {
    const headers = new Headers({
      "Content-Disposition": 'attachment; filename="...."',
      "Content-Type": "application/pdf",
    });
    const result = getFilename("https://example.com/...", headers);
    expect(result.endsWith(".pdf")).toBe(true);
    expect(result.length).toBeGreaterThan(4);
    expect(result).not.toContain("..");
  });

  test("generates fallback UUID when URL has no filename and no Content-Disposition", () => {
    const headers = new Headers({
      "Content-Type": "text/plain",
    });
    const result = getFilename("https://example.com/", headers);
    expect(result.endsWith(".txt")).toBe(true);
    expect(result.length).toBeGreaterThan(4);
  });
});
