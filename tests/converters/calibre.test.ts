import { expect, test } from "bun:test";
import { convert } from "../../src/converters/calibre";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes ebook-convert with input and target path", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/book.epub", "epub", "mobi", "out/book.mobi", undefined, execFile);

  expect(calls).toEqual([{ cmd: "ebook-convert", args: ["in/book.epub", "out/book.mobi"] }]);
});

test.each([
  // the extension is harmless, so only the file type triggers the rejection
  ["recipe file type", "in/news.txt", "recipe"],
  ["downloaded_recipe file type", "in/news.txt", "downloaded_recipe"],
  ["upper-case file type", "in/news.txt", "RECIPE"],
  ["recipe extension with another file type", "in/news.recipe", "txt"],
  ["upper-case downloaded_recipe extension", "in/news.DOWNLOADED_RECIPE", "txt"],
])("rejects recipe input (%s) without invoking ebook-convert", async (_, filePath, fileType) => {
  const { execFile, calls } = createMockExecFile();

  await expect(
    convert(filePath, fileType, "epub", "out/news.epub", undefined, execFile),
  ).rejects.toThrow("Recipe files are not supported");
  expect(calls).toHaveLength(0);
});

test("accepts files without an extension", async () => {
  const { execFile, calls } = createMockExecFile();

  await expect(
    convert("in/README", "txt", "epub", "out/README.epub", undefined, execFile),
  ).resolves.toBe("Done");
  expect(calls).toHaveLength(1);
});
