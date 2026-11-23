import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  resolveStoredFileName,
  resolveStoredFileNames,
  sanitizeFileName,
} from "../../src/helpers/sanitizeFileName";

describe("sanitizeFileName", () => {
  test("canonicalizes NFD to NFC before enforcing the 255-byte limit", () => {
    const nfc = `${"a".repeat(249)}\u00e4.pdf`;
    const nfd = `${"a".repeat(249)}a\u0308.pdf`;

    expect(Buffer.byteLength(nfc, "utf-8")).toBe(255);
    expect(Buffer.byteLength(nfd, "utf-8")).toBe(256);
    expect(sanitizeFileName(nfd)).toBe(nfc);
    expect(sanitizeFileName(nfc)).toBe(nfc);
  });
});

describe("resolveStoredFileNames", () => {
  test("preserves exact normalization match when NFC and NFD files coexist", async () => {
    if (process.platform === "darwin") {
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "convertx-fn-"));
    try {
      writeFileSync(path.join(dir, "\u00e4.txt"), "nfc");
      writeFileSync(path.join(dir, "a\u0308.txt"), "nfd");

      expect(await resolveStoredFileNames(dir, ["\u00e4.txt", "a\u0308.txt"])).toEqual([
        "\u00e4.txt",
        "a\u0308.txt",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolves mixed NFC, NFD, and missing files in a single batch", async () => {
    if (process.platform === "darwin") {
      return;
    }
    const dir = mkdtempSync(path.join(tmpdir(), "convertx-batch-"));
    try {
      writeFileSync(path.join(dir, "a\u0308-only-nfd.txt"), "1");
      writeFileSync(path.join(dir, "\u00f6-only-nfc.txt"), "2");

      expect(
        await resolveStoredFileNames(dir, [
          "\u00e4-only-nfd.txt",
          "o\u0308-only-nfc.txt",
          "a\u0308missing.txt",
        ]),
      ).toEqual(["a\u0308-only-nfd.txt", "\u00f6-only-nfc.txt", "\u00e4missing.txt"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("handles non-directory paths gracefully (ENOTDIR)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "convertx-enotdir-"));
    try {
      const notADir = path.join(dir, "file");
      writeFileSync(notADir, "not a directory");

      expect(await resolveStoredFileName(notADir, "a\u0308.txt")).toBe("\u00e4.txt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
