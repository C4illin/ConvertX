import { expect, test } from "bun:test";
import { convert } from "../../src/converters/assimp";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes assimp export with the target format id", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/scene.obj", "obj", "stl", "out/scene.stl", undefined, execFile);

  expect(calls).toEqual([
    { cmd: "assimp", args: ["export", "in/scene.obj", "out/scene.stl", "-fstl"] },
  ]);
});

test("passes format ids that are not file extensions through unchanged", async () => {
  // e.g. glb2 is written to a .glb file, but assimp still needs -fglb2
  const { execFile, calls } = createMockExecFile();

  await convert("in/scene.obj", "obj", "glb2", "out/scene.glb", undefined, execFile);

  expect(calls[0]?.args).toEqual(["export", "in/scene.obj", "out/scene.glb", "-fglb2"]);
});
