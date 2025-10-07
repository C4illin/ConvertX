import { expect, test } from "bun:test";
import type { ExecFileException } from "node:child_process";
import { convert } from "../../src/converters/msgconvert";
import { ExecFileFn } from "../../src/converters/types";

test("convert rejects conversion if input filetype is not msg and output type is not eml", async () => {
  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "Fake stdout", "");
  };

  const expectedError = new Error(
    "Unsupported conversion from obj to stl. Only MSG to EML conversion is currently supported.",
  );

  expect(convert("input.obj", "obj", "stl", "output.stl", undefined, mockExecFile)).rejects.toEqual(
    expectedError,
  );
});

test("convert rejects conversion on error", async () => {
  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback(new Error("Test error"), "", "");
  };

  const expectedError = new Error("msgconvert failed: Test error");

  expect(convert("input.msg", "msg", "eml", "output.eml", undefined, mockExecFile)).rejects.toEqual(
    expectedError,
  );
});

test("convert logs stderr as warning", async () => {
  const originalConsoleWarn = console.warn;

  let loggedMessage = "";
  console.warn = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile = (
    _cmd: string,
    _args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "", "Fake stderr");
  };

  await convert("file.msg", "msg", "eml", "out.eml", undefined, mockExecFile);

  console.error = originalConsoleWarn;

  expect(loggedMessage).toBe("msgconvert stderr: Fake stderr");
});
