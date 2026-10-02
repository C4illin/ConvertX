import { expect, test } from "bun:test";
import { convert } from "../../src/converters/resvg";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes resvg with input and target path", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/icon.svg", "svg", "png", "out/icon.png", undefined, execFile);

  expect(calls).toEqual([{ cmd: "resvg", args: ["in/icon.svg", "out/icon.png"] }]);
});
