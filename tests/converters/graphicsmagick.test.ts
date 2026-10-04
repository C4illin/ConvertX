import { beforeEach, expect, test } from "bun:test";
import type { ExecFileException } from "node:child_process";
import { convert } from "../../src/converters/graphicsmagick";
import { ExecFileFn } from "../../src/converters/types";
import { runCommonTests } from "./helpers/commonTests";

let calls: string[][] = [];

beforeEach(() => {
  calls = [];
});

runCommonTests(convert);

test("convert applies EXIF auto-orient", async () => {
  let command = "";
  const mockExecFile: ExecFileFn = (
    cmd: string,
    args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    command = cmd;
    calls.push(args);
    callback(null, "", "");
  };

  const result = await convert("input.jpg", "jpg", "pdf", "output.pdf", undefined, mockExecFile);

  expect(result).toBe("Done");
  expect(command).toBe("gm");
  expect(calls[0]).toEqual(["convert", "input.jpg", "-auto-orient", "output.pdf"]);
});
