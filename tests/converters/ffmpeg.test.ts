import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/ffmpeg";
import type { ExecFileOptions } from "node:child_process";
import { captureConsole } from "./helpers/converters";

let calls: string[][] = [];
let commands: string[] = [];
let lastOptions: ExecFileOptions | undefined;

function mockExecFile(
  cmd: string,
  args: string[],
  options: ExecFileOptions,
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) {
  commands.push(cmd);
  calls.push(args);
  lastOptions = options;
  if (args.includes("fail.mov")) {
    callback(new Error("mock failure"), "", "Fake stderr: fail");
  } else {
    callback(null, "Fake stdout", "");
  }
}

// Both variables are read on every call and may be set in the developer's shell
// (mise.toml sets FFMPEG_OUTPUT_ARGS), so isolate them and restore them afterwards.
const originalEnv = {
  FFMPEG_ARGS: process.env.FFMPEG_ARGS,
  FFMPEG_OUTPUT_ARGS: process.env.FFMPEG_OUTPUT_ARGS,
};

let output: ReturnType<typeof captureConsole>;

beforeEach(() => {
  calls = [];
  commands = [];
  lastOptions = undefined;
  delete process.env.FFMPEG_ARGS;
  delete process.env.FFMPEG_OUTPUT_ARGS;
  output = captureConsole();
});

afterEach(() => {
  output.restore();
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

const ICO_FILTER = "scale='min(256,iw)':min'(256,ih)':force_original_aspect_ratio=decrease";

test("converts a normal file", async () => {
  const result = await convert("in.mp4", "mp4", "avi", "out.avi", undefined, mockExecFile);

  expect(result).toBe("Done");
  expect(commands).toEqual(["ffmpeg"]);
  expect(calls).toEqual([["-i", "in.mp4", "out.avi"]]);
  expect(output.logs).toEqual(["stdout: Fake stdout"]);
});

test("adds resize for ico output", async () => {
  const result = await convert("in.png", "png", "ico", "out.ico", undefined, mockExecFile);

  expect(result).toBe("Done: resized to 256x256");
  expect(calls[0]).toEqual(["-i", "in.png", "-filter:v", ICO_FILTER, "out.ico"]);
});

test.each([
  ["av1.mp4", "libaom-av1"],
  ["av1.mkv", "libaom-av1"],
  ["h264.mp4", "libx264"],
  ["h264.mkv", "libx264"],
  ["h265.mp4", "libx265"],
  ["h265.mkv", "libx265"],
  ["h266.mp4", "libx266"],
  ["h266.mkv", "libx266"],
])("uses the right video codec for %s", async (convertTo, codec) => {
  const result = await convert("in.mkv", "mkv", convertTo, "out.video", undefined, mockExecFile);

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(["-i", "in.mkv", "-c:v", codec, "out.video"]);
});

test("does not force a codec for an unknown codec prefix", async () => {
  await convert("in.mkv", "mkv", "vp9.webm", "out.webm", undefined, mockExecFile);

  expect(calls[0]).toEqual(["-i", "in.mkv", "out.webm"]);
});

test("respects FFMPEG_ARGS", async () => {
  process.env.FFMPEG_ARGS = "-hide_banner -y";

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile);

  expect(calls[0]).toEqual(["-hide_banner", "-y", "-i", "input.mov", "output.mp4"]);
});

test("places FFMPEG_OUTPUT_ARGS after the input", async () => {
  process.env.FFMPEG_OUTPUT_ARGS = "-preset veryfast -threads 2";

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile);

  expect(calls[0]).toEqual([
    "-i",
    "input.mov",
    "-preset",
    "veryfast",
    "-threads",
    "2",
    "output.mp4",
  ]);
});

test("orders global args, input, output args, codec args and target", async () => {
  process.env.FFMPEG_ARGS = "-hwaccel vaapi";
  process.env.FFMPEG_OUTPUT_ARGS = "-preset veryfast";

  await convert("in.mkv", "mkv", "h265.mp4", "out.mp4", undefined, mockExecFile);

  expect(calls[0]).toEqual([
    "-hwaccel",
    "vaapi",
    "-i",
    "in.mkv",
    "-preset",
    "veryfast",
    "-c:v",
    "libx265",
    "out.mp4",
  ]);
});

test("splits FFMPEG_ARGS on any whitespace", async () => {
  process.env.FFMPEG_ARGS = "-hide_banner\t-y   -nostdin";

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile);

  expect(calls[0]?.slice(0, 3)).toEqual(["-hide_banner", "-y", "-nostdin"]);
});

// BUG: split(/\s+/) keeps empty strings for leading/trailing whitespace
// (" -y ".split(/\s+/) is ["", "-y", ""]), so ffmpeg receives "" as an argument
// and fails. Remove `.failing` once src/converters/ffmpeg.ts drops empty entries.
test.failing("ignores leading and trailing whitespace in FFMPEG_ARGS", async () => {
  process.env.FFMPEG_ARGS = " -y ";
  process.env.FFMPEG_OUTPUT_ARGS = " -preset veryfast ";

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile);

  expect(calls[0]).toEqual(["-y", "-i", "input.mov", "-preset", "veryfast", "output.mp4"]);
});

test("fails on exec error", async () => {
  await expect(
    convert("fail.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile),
  ).rejects.toBe("error: Error: mock failure");

  expect(output.errors).toEqual(["stderr: Fake stderr: fail"]);
});

test("logs stderr when execFile returns only stderr and no error", async () => {
  // Mock execFile to call back with no error, no stdout, but with stderr
  const mockExecFileStderrOnly = (
    _cmd: string,
    _args: string[],
    _options: ExecFileOptions,
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "", "Only stderr output");
  };

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFileStderrOnly);

  expect(output.errors).toEqual(["stderr: Only stderr output"]);
  expect(output.logs).toEqual([]);
});

test("passes a maxBuffer above the 1 MB default so long conversions don't overflow stderr (#565)", async () => {
  await convert("in.mkv", "mkv", "h264.mp4", "out.mp4", undefined, mockExecFile);

  // execFile's default maxBuffer is 1 MB; ffmpeg's progress output on a long
  // encode exceeds it and the conversion fails with "stderr maxBuffer length
  // exceeded". Lock in the raised buffer (must match FFMPEG_MAX_BUFFER in
  // ffmpeg.ts) so a regression to a smaller-but-still-over-1-MB value is caught.
  expect(lastOptions?.maxBuffer).toBe(1024 * 1024 * 64);
});
