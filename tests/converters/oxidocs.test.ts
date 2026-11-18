import { expect, test } from "bun:test";

import { convert } from "../../src/converters/oxidocs";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("converts docx to pdf with docx-to-pdf", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/report.docx", "docx", "pdf", "out/report.pdf", undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "oxidocs",
      args: ["docx-to-pdf", "--strict", "--quiet", "in/report.docx", "out/report.pdf"],
    },
  ]);
});

test("draws the first page with docx-to-png", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/report.docx", "docx", "png", "out/report.png", undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "oxidocs",
      args: ["docx-to-png", "--strict", "--quiet", "in/report.docx", "out/report.png"],
    },
  ]);
});

test("converts a presentation with pptx-to-pdf and pptx-to-png", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/deck.pptx", "pptx", "pdf", "out/deck.pdf", undefined, execFile);
  await convert("in/deck.pptx", "pptx", "png", "out/deck.png", undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "oxidocs",
      args: ["pptx-to-pdf", "--strict", "--quiet", "in/deck.pptx", "out/deck.pdf"],
    },
    {
      cmd: "oxidocs",
      args: ["pptx-to-png", "--strict", "--quiet", "in/deck.pptx", "out/deck.png"],
    },
  ]);
});

test("converts a workbook with xlsx-to-pdf and xlsx-to-png", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/sheet.xlsx", "xlsx", "pdf", "out/sheet.pdf", undefined, execFile);
  await convert("in/sheet.xlsx", "xlsx", "png", "out/sheet.png", undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "oxidocs",
      args: ["xlsx-to-pdf", "--strict", "--quiet", "in/sheet.xlsx", "out/sheet.pdf"],
    },
    {
      cmd: "oxidocs",
      args: ["xlsx-to-png", "--strict", "--quiet", "in/sheet.xlsx", "out/sheet.png"],
    },
  ]);
});
