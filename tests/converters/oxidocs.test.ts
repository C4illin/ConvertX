import { expect, test } from "bun:test";

import { convert } from "../../src/converters/oxidocs";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("converts docx to pdf with docx-to-pdf", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/report.docx", "docx", "pdf", "out/report.pdf", undefined, execFile);

  expect(calls).toEqual([
    { cmd: "oxidocs", args: ["docx-to-pdf", "--quiet", "in/report.docx", "out/report.pdf"] },
  ]);
});

test("draws the first page with docx-to-png", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/report.docx", "docx", "png", "out/report.png", undefined, execFile);

  expect(calls).toEqual([
    { cmd: "oxidocs", args: ["docx-to-png", "--quiet", "in/report.docx", "out/report.png"] },
  ]);
});
