import { expect } from "bun:test";
import type { ExecFileException } from "node:child_process";
import { ConvertFnWithExecFile, ExecFileFn } from "../../../src/converters/types";

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

  // Test with error object lacking 'message' property
  const mockExecFileNoMessage: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    // Simulate a non-standard error object
    callback({ notMessage: true } as unknown as ExecFileException, "", "");
  };

  expect(
    convertFn("input.obj", "obj", "stl", "output.stl", undefined, mockExecFileNoMessage),
  ).rejects.toMatch(/error:/i);

  // Test with a non-object error (e.g., a string)
  const mockExecFileStringError: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback("string error" as unknown as ExecFileException, "", "");
  };

  expect(
    convertFn("input.obj", "obj", "stl", "output.stl", undefined, mockExecFileStringError),
  ).rejects.toMatch(/error:/i);
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
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "", "Fake stderr");
  };

  await convertFn("file.obj", "obj", "stl", "out.stl", undefined, mockExecFile);

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Fake stderr");
}

export async function runConvertLogsStderrorAndStdout(convertFn: ConvertFnWithExecFile) {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  let loggedError = "";
  let loggedMessage = "";
  console.error = (msg) => {
    loggedError = msg;
  };
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile = (
    _cmd: string,
    _args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "Fake stdout", "Fake stderr");
  };

  await convertFn("file.obj", "obj", "stl", "out.stl", undefined, mockExecFile);

  console.error = originalConsoleError;
  console.log = originalConsoleLog;

  expect(loggedError).toBe("stderr: Fake stderr");
  expect(loggedMessage).toBe("stdout: Fake stdout");
}
