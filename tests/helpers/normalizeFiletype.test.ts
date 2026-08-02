import { test, expect } from "bun:test";
import { normalizeFiletype, normalizeOutputFiletype } from "../../src/helpers/normalizeFiletype";

test("normalizeFiletype maps known inputs", () => {
  expect(normalizeFiletype("jfif")).toBe("jpeg");
  expect(normalizeFiletype("jpg")).toBe("jpeg");
  expect(normalizeFiletype("HTM")).toBe("html");
  expect(normalizeFiletype("tex")).toBe("latex");
  expect(normalizeFiletype("md")).toBe("markdown");
  expect(normalizeFiletype("unknown")).toBe("m4a");
  expect(normalizeFiletype("SVG")).toBe("svg");
});

test("normalizeOutputFiletype maps known outputs", () => {
  expect(normalizeOutputFiletype("jpeg")).toBe("jpg");
  expect(normalizeOutputFiletype("latex")).toBe("tex");
  expect(normalizeOutputFiletype("markdown")).toBe("md");
  expect(normalizeOutputFiletype("markdown_mmd")).toBe("md");
  expect(normalizeOutputFiletype("glb2")).toBe("glb");
  expect(normalizeOutputFiletype("gltf2")).toBe("gltf");
  expect(normalizeOutputFiletype("objnomtl")).toBe("obj");
  expect(normalizeOutputFiletype("stlb")).toBe("stl");
  expect(normalizeOutputFiletype("plyb")).toBe("ply");
  expect(normalizeOutputFiletype("fbxa")).toBe("fbx");
  expect(normalizeOutputFiletype("assjson")).toBe("json");
  expect(normalizeOutputFiletype("WeIrDCase")).toBe("weirdcase");
});
