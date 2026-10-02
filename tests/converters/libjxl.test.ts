import { expect, test } from "bun:test";
import { convert } from "../../src/converters/libjxl";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("convert uses djxl with input filetype being jxl", async () => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert("input.jxl", "jxl", "png", "output.png", undefined, execFile);

  expect(result).toBe("Done");
  expect(calls).toEqual([{ cmd: "djxl", args: ["input.jxl", "output.png"] }]);
});

test("convert uses cjxl with output filetype being jxl", async () => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert("input.png", "png", "jxl", "output.jxl", undefined, execFile);

  expect(result).toBe("Done");
  expect(calls).toEqual([{ cmd: "cjxl", args: ["input.png", "output.jxl"] }]);
});

test("convert prefers cjxl when both input and output filetype are jxl", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("input.jxl", "jxl", "jxl", "output.jxl", undefined, execFile);

  expect(calls[0]?.cmd).toBe("cjxl");
});

test("convert uses empty string as command with neither input nor output filetype being jxl", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("input.png", "png", "jpg", "output.jpg", undefined, execFile);

  expect(calls[0]?.cmd).toBe("");
});
