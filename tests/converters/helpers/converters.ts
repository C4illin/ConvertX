import type { ExecFileException } from "node:child_process";
import { expect } from "bun:test";
import { ConvertFnWithExecFile, ExecFileFn } from "../../../src/converters/types.ts";

export async function runConvertSuccessTest(convertFn: ConvertFnWithExecFile) {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "Fake stdout", "");
  };

  const result = await convertFn("input.obj", "obj", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(loggedMessage).toBe("stdout: Fake stdout");
}

export async function runConvertFailTest(convertFn: ConvertFnWithExecFile) {
  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback(new Error("Test error"), "", "");
  };

  expect(
    convertFn("input.obj", "obj", "stl", "output.stl", undefined, mockExecFile),
  ).rejects.toMatch(/error: Error: Test error/);
}

export async function runConvertLogsStderror(convertFn: ConvertFnWithExecFile) {
  const originalConsoleError = console.error;

  let loggedMessage = "";
  console.error = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile = (
    _cmd: string,
    _args: string[],
    cb: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    cb(null, "", "Fake stderr");
  };

  await convertFn("file.obj", "obj", "stl", "out.stl", undefined, mockExecFile);

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Fake stderr");
}
