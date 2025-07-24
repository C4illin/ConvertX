import type { ExecFileException } from "node:child_process";
import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/imagemagick.ts";
import { ExecFileFn } from "../../src/converters/types.ts";
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

test("convert respects ico conversion target type", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    options: unknown,
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.obj", "eps", "ico", "output.ico", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(
    expect.arrayContaining([
      "-define",
      "icon:auto-resize=256,128,64,48,32,16",
      "-background",
      "none",
      "input.obj",
      "output.ico",
    ]),
  );
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert respects ico conversion target type with svg as input filetype", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    options: unknown,
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.svg", "svg", "ico", "output.ico", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(
    expect.arrayContaining([
      "-define",
      "icon:auto-resize=256,128,64,48,32,16",
      "-background",
      "none",
      "-density",
      "512",
      "input.svg",
      "output.ico",
    ]),
  );
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert respects ico conversion target type with emf as input filetype", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    options: unknown,
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.emf", "emf", "ico", "output.ico", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(
    expect.arrayContaining([
      "-define",
      "icon:auto-resize=256,128,64,48,32,16",
      "-background",
      "none",
      "emf:delegate=false",
      "-density",
      "300",
      "white",
      "-alpha",
      "remove",
      "input.emf",
      "output.ico",
    ]),
  );
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert respects emf as input filetype", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (
    _cmd: string,
    _args: string[],
    options: unknown,
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    calls.push(_args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.emf", "emf", "obj", "output.obj", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(
    expect.arrayContaining([
      "-define",
      "emf:delegate=false",
      "-density",
      "300",
      "-background",
      "white",
      "-alpha",
      "remove",
      "input.emf",
      "output.obj",
    ]),
  );
  expect(loggedMessage).toBe("stdout: Fake stdout");
});
