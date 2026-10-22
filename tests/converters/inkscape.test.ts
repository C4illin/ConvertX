import { expect, test } from "bun:test";
import { convert } from "../../src/converters/inkscape";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes inkscape with input and -o target path", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/drawing.svg", "svg", "png", "out/drawing.png", undefined, execFile);

  expect(calls).toEqual([{ cmd: "inkscape", args: ["in/drawing.svg", "-o", "out/drawing.png"] }]);
});
