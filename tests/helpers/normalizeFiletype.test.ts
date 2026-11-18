import { expect, test } from "bun:test";

import {
  normalizeFiletype,
  normalizeOutputFiletype,
  splitFileName,
} from "../../src/helpers/normalizeFiletype";

test("normalizeFiletype maps known inputs", () => {
  expect(normalizeFiletype("jfif")).toBe("jpeg");
  expect(normalizeFiletype("jpg")).toBe("jpeg");
  expect(normalizeFiletype("HTM")).toBe("html");
  expect(normalizeFiletype("tex")).toBe("latex");
  expect(normalizeFiletype("md")).toBe("markdown");
  expect(normalizeFiletype("unknown")).toBe("m4a");
  expect(normalizeFiletype("SVG")).toBe("svg");
  expect(normalizeFiletype("3CX.WAV")).toBe("3cx.wav");
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
  expect(normalizeOutputFiletype("3cx.wav")).toBe("3cx.wav");
});

test("splitFileName recognizes compound extensions from the known list", () => {
  const known = ["nii.gz", "hdr.gz", "nii", "png", "vcf"];
  expect(splitFileName("scan.nii.gz", known)).toEqual({ filetype: "nii.gz", stem: "scan" });
  expect(splitFileName("scan.nii", known)).toEqual({ filetype: "nii", stem: "scan" });
  expect(splitFileName("photo.png", known)).toEqual({ filetype: "png", stem: "photo" });
});

test("splitFileName prefers the longest known extension and keeps the original casing", () => {
  const known = ["gz", "nii.gz"];
  expect(splitFileName("scan.nii.gz", known)).toEqual({ filetype: "nii.gz", stem: "scan" });
  expect(splitFileName("scan.NII.GZ", known)).toEqual({ filetype: "NII.GZ", stem: "scan" });
  expect(splitFileName("archive.gz", known)).toEqual({ filetype: "gz", stem: "archive" });
});

test("splitFileName matches mixed-case entries in the known list", () => {
  const known = ["NII.GZ", "Hdr.Gz"];
  expect(splitFileName("scan.nii.gz", known)).toEqual({ filetype: "nii.gz", stem: "scan" });
  expect(splitFileName("SCAN.NII.GZ", known)).toEqual({ filetype: "NII.GZ", stem: "SCAN" });
  expect(splitFileName("scan.HDR.GZ", known)).toEqual({ filetype: "HDR.GZ", stem: "scan" });
  expect(splitFileName("photo.png", known)).toEqual({ filetype: "png", stem: "photo" });
});

test("splitFileName falls back to the last segment when no known extension matches", () => {
  const known = ["nii.gz", "png"];
  expect(splitFileName("archive.tar.gz", known)).toEqual({ filetype: "gz", stem: "archive.tar" });
  expect(splitFileName("photo.JPG", known)).toEqual({ filetype: "JPG", stem: "photo" });
  expect(splitFileName("vcf.backup.vcf", ["vcf"])).toEqual({ filetype: "vcf", stem: "vcf.backup" });
});

test("splitFileName handles names without an extension", () => {
  expect(splitFileName("noextfile", ["png"])).toEqual({ filetype: "", stem: "noextfile" });
  expect(splitFileName("noextfile", [])).toEqual({ filetype: "", stem: "noextfile" });
});
