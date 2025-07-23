import type { ExecFileException } from "node:child_process";
import { expect, test } from "bun:test";
import { convert } from "../src/converters/assimp";

type ExecFileFn = (
  cmd: string,
  args: string[],
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) => void;

test("convert resolves when execFile succeeds", async () => {
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

  const result = await convert("input.obj", "obj", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert rejects when execFile fails", async () => {
  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callback(new Error("Test error"), "", "");
  };

  expect(convert("input.obj", "obj", "stl", "output.stl", undefined, mockExecFile)).rejects.toMatch(
    /error: Error: Test error/,
  );
});

test("convert logs stderr when present", async () => {
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

  await convert("file.obj", "obj", "stl", "out.stl", undefined, mockExecFile);

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Fake stderr");
});
