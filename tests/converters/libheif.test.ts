import { expect, test } from "bun:test";
import { convert } from "../../src/converters/libheif";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes heif-convert with input and target path", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/photo.heic", "heic", "jpeg", "out/photo.jpg", undefined, execFile);

  expect(calls).toEqual([{ cmd: "heif-convert", args: ["in/photo.heic", "out/photo.jpg"] }]);
});
