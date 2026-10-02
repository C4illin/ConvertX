import { expect, test } from "bun:test";
import { convert } from "../../src/converters/graphicsmagick";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("convert applies EXIF auto-orient", async () => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert("input.jpg", "jpg", "pdf", "output.pdf", undefined, execFile);

  expect(result).toBe("Done");
  expect(calls).toEqual([
    { cmd: "gm", args: ["convert", "input.jpg", "-auto-orient", "output.pdf"] },
  ]);
});
