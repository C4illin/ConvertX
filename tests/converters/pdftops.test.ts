import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/pdftops";
import { runCommonTests } from "./helpers/commonTests";

runCommonTests(convert);

let calls: string[][] = [];

function mockExecFile(
  _cmd: string,
  args: string[],
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) {
  calls.push(args);
  if (args.includes("fail.pdf")) {
    callback(new Error("mock failure"), "", "Fake stderr: fail");
  } else {
    callback(null, "Fake stdout", "");
  }
}

beforeEach(() => {
  calls = [];
});

test("converts a normal file to ps", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const result = await convert("in.pdf", "pdf", "ps", "out.ps", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(["in.pdf", "out.ps"]);
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("adds -eps flag for eps output", async () => {
  const result = await convert("in.pdf", "pdf", "eps", "out.eps", undefined, mockExecFile);

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(["-eps", "in.pdf", "out.eps"]);
});

test("fails on exec error", async () => {
  expect(convert("fail.pdf", "pdf", "ps", "output.ps", undefined, mockExecFile)).rejects.toMatch(
    /error: Error: mock failure/
  );
});

test("logs stderr when execFile returns only stderr and no error", async () => {
  const originalConsoleError = console.error;

  let loggedMessage = "";
  console.error = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFileStderrOnly = (
    _cmd: string,
    _args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "", "Only stderr output");
  };

  await convert("input.pdf", "pdf", "ps", "output.ps", undefined, mockExecFileStderrOnly);

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Only stderr output");
});
