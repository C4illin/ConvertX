import { beforeEach, expect, test } from "bun:test";
import { convert, resetNvidiaGpuCache } from "../../src/converters/ffmpeg";

let calls: string[][] = [];

function mockExecFile(
  _cmd: string,
  args: string[],
  callback: (err: Error | null, stdout: string, stderr: string) => void,
) {
  calls.push(args);
  if (args.includes("fail.mov")) {
    callback(new Error("mock failure"), "", "Fake stderr: fail");
  } else if (_cmd === "nvidia-smi") {
    // Mock nvidia-smi - assume GPU is available for tests
    callback(
      null,
      "GPU 0: NVIDIA GeForce RTX 3080 (UUID: GPU-12345678-1234-1234-1234-123456789012)\n",
      "",
    );
  } else if (_cmd === "ffprobe") {
    // Mock ffprobe responses for codec detection
    // Return H.264 codec for .mp4 files, no video stream for images
    if (args.includes("in.mp4") || args.includes("in.mkv") || args.includes("in.avi")) {
      callback(
        null,
        JSON.stringify({
          streams: [
            {
              codec_type: "video",
              codec_name: "h264",
            },
          ],
        }),
        "",
      );
    } else if (args.includes("in.jpg") || args.includes("in.png")) {
      // Image files have no video stream
      callback(
        null,
        JSON.stringify({
          streams: [
            {
              codec_type: "audio",
              codec_name: "pcm",
            },
          ],
        }),
        "",
      );
    } else {
      // Default: assume H.264 for video files
      callback(
        null,
        JSON.stringify({
          streams: [
            {
              codec_type: "video",
              codec_name: "h264",
            },
          ],
        }),
        "",
      );
    }
  } else {
    callback(null, "Fake stdout", "");
  }
}

beforeEach(() => {
  calls = [];
  delete process.env.FFMPEG_ARGS;
  delete process.env.FFMPEG_PREFER_HARDWARE;
  // Reset the GPU availability cache between tests
  resetNvidiaGpuCache();
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

test("uses h264_nvenc for h264.mp4 when hardware preferred", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "true";

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h264.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  // calls[0] is nvidia-smi, calls[1] is ffprobe, calls[2] is ffmpeg
  expect(calls[2]).toEqual(expect.arrayContaining(["-c:v", "h264_nvenc"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
});

test("uses hevc_nvenc for h265.mp4 when hardware preferred", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "true";

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h265.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  // calls[0] is nvidia-smi, calls[1] is ffprobe, calls[2] is ffmpeg
  expect(calls[2]).toEqual(expect.arrayContaining(["-c:v", "hevc_nvenc"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
});

test("uses libx264 for h264.mp4 when hardware not preferred", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "false";

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mkv", "mkv", "h264.mp4", "out.mp4", undefined, mockExecFile);

  console.log = originalConsoleLog;

  expect(calls[0]).toEqual(expect.arrayContaining(["-c:v", "libx264"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
});

test("adds CUDA hwaccel for video input when hardware preferred", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "true";
  delete process.env.FFMPEG_ARGS;

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mp4", "mp4", "avi", "out.avi", undefined, mockExecFile);

  console.log = originalConsoleLog;

  // calls[0] is nvidia-smi, calls[1] is ffprobe, calls[2] is ffmpeg
  expect(calls[2]).toEqual(expect.arrayContaining(["-hwaccel", "cuda"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
});

test("does not add CUDA hwaccel for image input when hardware preferred", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "true";
  delete process.env.FFMPEG_ARGS;

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.jpg", "jpg", "png", "out.png", undefined, mockExecFile);

  console.log = originalConsoleLog;

  // calls[0] is nvidia-smi, calls[1] is ffprobe, calls[2] is ffmpeg
  expect(calls[2]).not.toEqual(expect.arrayContaining(["-hwaccel", "cuda"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
});

test("does not add CUDA hwaccel if FFMPEG_ARGS already specifies hwaccel", async () => {
  process.env.FFMPEG_PREFER_HARDWARE = "true";
  process.env.FFMPEG_ARGS = "-hwaccel vaapi";

  const originalConsoleLog = console.log;

  let loggedMessage = "";
  console.log = (msg) => {
    loggedMessage = msg;
  };

  await convert("in.mp4", "mp4", "avi", "out.avi", undefined, mockExecFile);

  console.log = originalConsoleLog;

  // When FFMPEG_ARGS already has hwaccel, no ffprobe call is made
  // calls[0] is nvidia-smi, calls[1] is ffmpeg
  // Should use vaapi from FFMPEG_ARGS, not add cuda
  expect(calls[1]).toEqual(expect.arrayContaining(["-hwaccel", "vaapi"]));
  expect(calls[0]).not.toEqual(expect.arrayContaining(["-hwaccel", "cuda"]));
  expect(loggedMessage).toBe("stdout: Fake stdout");

  delete process.env.FFMPEG_PREFER_HARDWARE;
  delete process.env.FFMPEG_ARGS;
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

test("logs stderr when execFile returns only stderr and no error", async () => {
  const originalConsoleError = console.error;

  let loggedMessage = "";
  console.error = (msg) => {
    loggedMessage = msg;
  };

  // Mock execFile to call back with no error, no stdout, but with stderr
  const mockExecFileStderrOnly = (
    _cmd: string,
    _args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    callback(null, "", "Only stderr output");
  };

  await convert("input.mov", "mov", "mp4", "output.mp4", undefined, mockExecFileStderrOnly);

  console.error = originalConsoleError;

  expect(loggedMessage).toBe("stderr: Only stderr output");
});
