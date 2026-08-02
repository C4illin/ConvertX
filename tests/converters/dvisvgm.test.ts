import type { ExecFileException } from "node:child_process";
import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/dvisvgm";
import { ExecFileFn } from "../../src/converters/types";
import { runCommonTests } from "./helpers/commonTests";

let calls: string[][] = [];

beforeEach(() => {
  calls = [];
});

runCommonTests(convert);

test("convert respects eps filetype", async () => {
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

  const result = await convert("input.eps", "eps", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["--eps", "input.eps", "output.stl"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert respects pdf filetype", async () => {
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

  const result = await convert("input.pdf", "pdf", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["--pdf", "input.pdf", "output.stl"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert respects svgz conversion target type", async () => {
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

  const result = await convert("input.obj", "eps", "svgz", "output.svgz", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["-z", "input.obj", "output.svgz"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});
