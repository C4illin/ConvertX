import { afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/pdftops";
import { runCommonTests } from "./helpers/commonTests";
import { captureConsole, createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

let output: ReturnType<typeof captureConsole>;

beforeEach(() => {
  output = captureConsole();
});

afterEach(() => {
  output.restore();
});

test("converts a normal file to ps", async () => {
  const { execFile, calls } = createMockExecFile({ stdout: "Fake stdout" });

  const result = await convert("in.pdf", "pdf", "ps", "out.ps", undefined, execFile);

  expect(result).toBe("Done");
  expect(calls).toEqual([{ cmd: "pdftops", args: ["in.pdf", "out.ps"] }]);
  expect(output.logs).toEqual(["stdout: Fake stdout"]);
});

test("adds -eps flag for eps output", async () => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert("in.pdf", "pdf", "eps", "out.eps", undefined, execFile);

  expect(result).toBe("Done");
  expect(calls).toEqual([{ cmd: "pdftops", args: ["-eps", "in.pdf", "out.eps"] }]);
});

test("fails on exec error without logging the output of the failed run", async () => {
  const { execFile } = createMockExecFile({
    error: new Error("mock failure"),
    stderr: "Fake stderr: fail",
  });

  await expect(convert("fail.pdf", "pdf", "ps", "output.ps", undefined, execFile)).rejects.toBe(
    "error: Error: mock failure",
  );
  expect(output.errors).toEqual([]);
});

test("logs stderr when execFile returns only stderr and no error", async () => {
  const { execFile } = createMockExecFile({ stderr: "Only stderr output" });

  await convert("input.pdf", "pdf", "ps", "output.ps", undefined, execFile);

  expect(output.errors).toEqual(["stderr: Only stderr output"]);
});
