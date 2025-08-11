import type { ExecFileException } from "node:child_process";
import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/libjxl.ts";
import { ExecFileFn } from "../../src/converters/types.ts";
import {
  runConvertFailTest,
  runConvertLogsStderror,
  runConvertSuccessTest,
} from "./helpers/converters.ts";

let command: string = "";

beforeEach(() => {
  command = "";
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

test("convert uses djxl with input filetype being jxl", async () => {
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
    command = _cmd;
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.jxl", "jxl", "png", "output.png", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(command).toEqual("djxl");
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert uses cjxl with output filetype being jxl", async () => {
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
    command = _cmd;
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.png", "png", "jxl", "output.jxl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(command).toEqual("cjxl");
  expect(loggedMessage).toBe("stdout: Fake stdout");
});
