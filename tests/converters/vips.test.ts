import type { ExecFileException } from "node:child_process";
import { beforeEach, expect, test } from "bun:test";
import { ExecFileFn } from "../../src/converters/types.ts";
import { convert } from "../../src/converters/vips.ts";
import {
  runConvertFailTest,
  runConvertLogsStderror,
  runConvertSuccessTest,
} from "./helpers/converters.ts";

let calls: string[][] = [];

beforeEach(() => {
  calls = [];
});

test("convert resolves when execFile succeeds", async () => {
  await runConvertSuccessTest(convert);
});

test("convert rejects when execFile fails", async () => {
  await runConvertFailTest(convert);
});

test("convert logs stderr when present", async () => {
  await runConvertLogsStderror(convert);
});

test("convert uses action pdfload with filetype being pdf", async () => {
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
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.pdf", "pdf", "obj", "output.obj", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["pdfload"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert uses action copy with filetype being anything but pdf", async () => {
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
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.jpg", "jpg", "obj", "output.obj", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["copy"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});
