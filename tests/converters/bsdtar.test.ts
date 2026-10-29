import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/bsdtar";
import type { ExecFileFn } from "../../src/converters/types";
import { runCommonTests } from "./helpers/commonTests";

let calls: string[][] = [];
let cmdCalled = "";

beforeEach(() => {
  calls = [];
  cmdCalled = "";
});

runCommonTests(convert);

test("converts an archive file using bsdtar", async () => {
  const originalConsoleLog = console.log;
  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const mockExecFile: ExecFileFn = (cmd, args, callback) => {
    cmdCalled = cmd;
    calls.push(args);
    callback(null, "Fake stdout", "");
  };

  const result = await convert("input.rar", "rar", "zip", "output.zip", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");

  expect(cmdCalled).toBe("bsdtar");

  expect(calls[0]).toEqual(["-a", "-cf", "output.zip", "@input.rar"]);

  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("fails on exec error", async () => {
  const mockExecFile: ExecFileFn = (cmd, args, callback) => {
    callback(new Error("mock failure"), "", "");
  };

  await expect(
    convert("fail.rar", "rar", "zip", "output.zip", undefined, mockExecFile),
  ).rejects.toMatch(/error: Error: mock failure/);
});
