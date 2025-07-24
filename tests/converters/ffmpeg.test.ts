import { beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/ffmpeg.ts";

let calls: string[][] = [];

function mockExecFile(
  _cmd: string,
  args: string[],
  options: unknown,
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) {
  calls.push(args);
  if (args.includes("fail.mov")) {
    callback(new Error("mock failure"), "", "Fake stderr: fail");
  } else {
    callback(null, "Fake stdout", "");
  }
}

beforeEach(() => {
  calls = [];
  delete process.env.FFMPEG_ARGS;
});

test("converts a normal file", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const result = await convert("in.mp4", "mp4", "avi", "out.avi", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done");
  expect(calls[0]).toEqual(expect.arrayContaining(["-i", "in.mp4", "out.avi"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("adds resize for ico output", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const result = await convert("in.png", "png", "ico", "out.ico", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(result).toBe("Done: resized to 256x256");
  expect(calls[0]).toEqual(
    expect.arrayContaining(["-filter:v", expect.stringContaining("scale=")]),
  );
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("uses libaom-av1 for av1.mp4", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "av1.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]).toEqual(expect.arrayContaining(["-c:v", "libaom-av1"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("uses libx264 for h264.mp4", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h264.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]).toEqual(expect.arrayContaining(["-c:v", "libx264"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("uses libx265 for h265.mp4", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h265.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]).toEqual(expect.arrayContaining(["-c:v", "libx265"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("uses libx266 for h266.mp4", async () => {
  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h266.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]).toEqual(expect.arrayContaining(["-c:v", "libx266"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("respects FFMPEG_ARGS", async () => {
  process.env.FFMPEG_ARGS = "-hide_banner -y";

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]?.slice(0, 2)).toEqual(["-hide_banner", "-y"]);
  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("fails on exec error", async () => {
  const originalConsoleError = console.error;

  let loggedMessage = "";
  console.error = (msg) => {
    loggedMessage = msg;
  };

  expect(convert("fail.mov", "mov", "mp4", "output.mp4", undefined, mockExecFile)).rejects.toThrow(
    "mock failure",
  );

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Fake stderr: fail");
});
