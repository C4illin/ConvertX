import { describe, expect, test } from "bun:test";

import { findPresetTarget } from "../../src/helpers/findPresetTarget";

const targets = [
  { target: "mp3", converter: "ffmpeg", value: "mp3,ffmpeg" },
  { target: "wav", converter: "ffmpeg", value: "wav,ffmpeg" },
  { target: "wav", converter: "other", value: "wav,other" },
];

describe("findPresetTarget", () => {
  test("returns undefined without a target", () => {
    expect(findPresetTarget(targets, null, null)).toBeUndefined();
  });

  test("matches by target only (first match)", () => {
    expect(findPresetTarget(targets, "wav", null)?.value).toBe("wav,ffmpeg");
  });

  test("matches by target and converter", () => {
    expect(findPresetTarget(targets, "wav", "other")?.value).toBe("wav,other");
  });

  test("returns undefined when nothing matches", () => {
    expect(findPresetTarget(targets, "mp3", "other")).toBeUndefined();
    expect(findPresetTarget(targets, "flac", null)).toBeUndefined();
  });
});
