import { afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/markitdown";
import { runCommonTests } from "./helpers/commonTests";
import { captureConsole, createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

let output: ReturnType<typeof captureConsole>;

beforeEach(() => {
  output = captureConsole();
});

afterEach(() => {
  output.restore();
});

test("invokes markitdown with input and -o target path", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/report.docx", "docx", "md", "out/report.md", undefined, execFile);

  expect(calls).toEqual([{ cmd: "markitdown", args: ["in/report.docx", "-o", "out/report.md"] }]);
});

test("prefixes rejections with the converter name", async () => {
  const { execFile } = createMockExecFile({ error: new Error("boom") });

  await expect(
    convert("in/report.docx", "docx", "md", "out/report.md", undefined, execFile),
  ).rejects.toBe("markitdown error: Error: boom");
});

test("does not log output of a failed run", async () => {
  const { execFile } = createMockExecFile({
    error: new Error("boom"),
    stdout: "partial",
    stderr: "trace",
  });

  await expect(
    convert("in/report.docx", "docx", "md", "out/report.md", undefined, execFile),
  ).rejects.toMatch(/boom/);
  expect(output.logs).toEqual([]);
  expect(output.errors).toEqual([]);
});
