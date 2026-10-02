import { expect, test } from "bun:test";
import { convert } from "../../src/converters/vips";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("uses the pdfload action for pdf input", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/doc.pdf", "pdf", "png", "out/doc.png", undefined, execFile);

  expect(calls).toEqual([{ cmd: "vips", args: ["pdfload", "in/doc.pdf", "out/doc.png"] }]);
});

test.each(["jpeg", "png", "svg", "tiff"])("uses the copy action for %s input", async (fileType) => {
  const { execFile, calls } = createMockExecFile();

  await convert(`in/image.${fileType}`, fileType, "webp", "out/image.webp", undefined, execFile);

  expect(calls).toEqual([
    { cmd: "vips", args: ["copy", `in/image.${fileType}`, "out/image.webp"] },
  ]);
});
