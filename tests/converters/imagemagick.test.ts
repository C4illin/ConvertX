import { beforeEach, expect, test } from "bun:test";
import type { ExecFileException } from "node:child_process";
import { convert } from "../../src/converters/imagemagick";
import { ExecFileFn } from "../../src/converters/types";
import { runCommonTests } from "./helpers/commonTests";

let calls: string[][] = [];

beforeEach(() => {
  calls = [];
});

runCommonTests(convert);

test("convert respects ico conversion target type", async () => {
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
