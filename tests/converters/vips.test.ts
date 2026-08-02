import { beforeEach, expect, test } from "bun:test";
import type { ExecFileException } from "node:child_process";
import { ExecFileFn } from "../../src/converters/types";
import { convert } from "../../src/converters/vips";
import { runCommonTests } from "./helpers/commonTests";

let calls: string[][] = [];

beforeEach(() => {
  calls = [];
});

runCommonTests(convert);

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
