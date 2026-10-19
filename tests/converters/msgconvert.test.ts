import { afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/msgconvert";
import { captureConsole, createMockExecFile } from "./helpers/converters";

let output: ReturnType<typeof captureConsole>;

beforeEach(() => {
  output = captureConsole();
});

afterEach(() => {
  output.restore();
});

test("convert invokes msgconvert with --outfile and resolves with the target path", async () => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert("in/mail.msg", "msg", "eml", "out/mail.eml", undefined, execFile);

  expect(result).toBe("out/mail.eml");
  expect(calls).toEqual([
    { cmd: "msgconvert", args: ["--outfile", "out/mail.eml", "in/mail.msg"] },
  ]);
});

test.each([
  ["obj", "stl"],
  ["msg", "pdf"],
  ["eml", "eml"],
  ["eml", "msg"],
])("convert rejects %s to %s without invoking msgconvert", async (fileType, convertTo) => {
  const { execFile, calls } = createMockExecFile();

  await expect(
    convert(`input.${fileType}`, fileType, convertTo, `output.${convertTo}`, undefined, execFile),
  ).rejects.toThrow(
    `Unsupported conversion from ${fileType} to ${convertTo}. Only MSG to EML conversion is currently supported.`,
  );
  expect(calls).toHaveLength(0);
});

test("convert rejects conversion on error", async () => {
  const { execFile } = createMockExecFile({ error: new Error("Test error") });

  await expect(
    convert("input.msg", "msg", "eml", "output.eml", undefined, execFile),
  ).rejects.toThrow("msgconvert failed: Test error");
});

test("convert logs stderr as warning", async () => {
  const { execFile } = createMockExecFile({ stderr: "Fake stderr" });

  await convert("file.msg", "msg", "eml", "out.eml", undefined, execFile);

  expect(output.warnings).toEqual(["msgconvert stderr: Fake stderr"]);
});

test("convert redacts absolute paths in logged stderr", async () => {
  const { execFile } = createMockExecFile({
    stderr: "cannot read /home/user/uploads/secret.msg: bad header",
  });

  await convert("file.msg", "msg", "eml", "out.eml", undefined, execFile);

  expect(output.warnings).toEqual(["msgconvert stderr: cannot read [REDACTED_PATH] bad header"]);
});

test("convert truncates logged stderr longer than 200 characters", async () => {
  const { execFile } = createMockExecFile({ stderr: "x".repeat(201) });

  await convert("file.msg", "msg", "eml", "out.eml", undefined, execFile);

  expect(output.warnings).toEqual([`msgconvert stderr: ${"x".repeat(200)}...`]);
});

test("convert does not truncate stderr of exactly 200 characters", async () => {
  const { execFile } = createMockExecFile({ stderr: "x".repeat(200) });

  await convert("file.msg", "msg", "eml", "out.eml", undefined, execFile);

  expect(output.warnings).toEqual([`msgconvert stderr: ${"x".repeat(200)}`]);
});

test("convert does not warn when stderr is empty", async () => {
  const { execFile } = createMockExecFile({ stdout: "converted" });

  await convert("file.msg", "msg", "eml", "out.eml", undefined, execFile);

  expect(output.warnings).toEqual([]);
});
