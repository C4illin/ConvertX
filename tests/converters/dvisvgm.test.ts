import type { ExecFileException } from "node:child_process";
import { expect, test } from "bun:test";
import { convert } from "../../src/converters/dvisvgm.ts";
import { ExecFileFn } from "../../src/converters/types.ts";
import {
  runConvertFailTest,
  runConvertLogsStderror,
  runConvertSuccessTest,
} from "./helpers/converters.ts";

test("convert resolves when execFile succeeds", async () => {
  await runConvertSuccessTest(convert);
});

test("convert rejects when execFile fails", async () => {
  await runConvertFailTest(convert);
});

test("convert logs stderr when present", async () => {
  await runConvertLogsStderror(convert);
});

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
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.obj", "eps", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
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
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.obj", "pdf", "stl", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
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
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.obj", "eps", "svgz", "output.stl", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(loggedMessage).toBe("stdout: Fake stdout");
});
