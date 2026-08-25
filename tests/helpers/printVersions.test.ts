import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { exec } from "node:child_process";
import { readFile } from "node:fs";

// mocks have to be defined before importing the module under test,
// otherwise the real modules will be loaded first and the mocks won't take effect.
mock.module("node:child_process", () => ({
  // The mock checks the environment variable MOCK_EXEC_ERROR at call-time so
  // individual tests can trigger error paths by setting that env before
  // importing the module under test.
  exec: mock((cmd: string, cb: (error: Error | null, stdout: string) => void) => {
    const shouldError = (process.env.MOCK_EXEC_ERROR || "")
      .split(",")
      .some((p) => p && cmd.includes(p));

    if (shouldError) {
      cb(new Error(`${cmd} not found`), "");
      return;
    }

    // resvg, bun, heif-info, dasel, and the perl one-liner (msgconvert) print just
    // the bare version number — the source code itself prepends the tool name as a label.
    if (
      cmd.startsWith("resvg") ||
      cmd.startsWith("bun") ||
      cmd.startsWith("heif-info") ||
      cmd.startsWith("dasel") ||
      cmd.startsWith("perl")
    ) {
      cb(null, "1.0.0\n");
      return;
    }

    // assimp's real output is multi-line; the source reads line index 5.
    if (cmd.startsWith("assimp")) {
      cb(null, "l1\nl2\nl3\nl4\nl5\nVersion 1.0.0 (GIT commit abc123)\n");
      return;
    }

    // magick prefixes its version line with "Version: ".
    if (cmd.startsWith("magick")) {
      cb(null, "Version: ImageMagick v1.0.0\n");
      return;
    }

    cb(null, `${cmd} v1.0.0\n`);
  }),
}));

mock.module("node:fs", () => ({
  readFile: mock(
    (path: string, encoding: string, cb: (error: Error | null, data: string) => void) => {
      cb(null, 'PRETTY_NAME="Ubuntu 22.04 LTS"\n');
    },
  ),
}));

mock.module("../../package.json", () => ({
  version: "1.0.0-test",
}));

// We import the module in each test after the spies and the desired NODE_ENV were set
// so that the top level execution is under control of each test

let consoleLogSpy: ReturnType<typeof spyOn>;
let consoleErrorSpy: ReturnType<typeof spyOn>;

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  delete process.env.NODE_ENV;
  delete process.env.MOCK_EXEC_ERROR;
});

test("prints only the version and terminates itself immediately when NODE_ENV is not production", async () => {
  consoleLogSpy = spyOn(console, "log");
  consoleErrorSpy = spyOn(console, "error");

  // import the module after the spies were set so that the initial console.log within the module
  // gets recognized by the spy
  await import("../../src/helpers/printVersions?test=" + Math.random());

  // empty the queue to make sure all callbacks have been processed
  await new Promise((resolve) => setImmediate(resolve));

  expect(consoleLogSpy).toHaveBeenCalledWith("ConvertX v1.0.0-test");
  expect(consoleLogSpy).toHaveBeenCalledTimes(1);
  expect(readFile).not.toHaveBeenCalled();
});

test("prints system information and tool versions in production mode", async () => {
  process.env.NODE_ENV = "production";
  consoleLogSpy = spyOn(console, "log");
  consoleErrorSpy = spyOn(console, "error");

  // import module under test after setting NODE_ENV and activating the spies
  await import("../../src/helpers/printVersions?test=" + Math.random());

  await new Promise((resolve) => setImmediate(resolve));

  expect(consoleLogSpy).toHaveBeenCalledWith("ConvertX v1.0.0-test");
  expect(consoleLogSpy).toHaveBeenCalledWith("Ubuntu 22.04 LTS");
  expect(readFile).toHaveBeenCalledTimes(1);
  expect(exec).toHaveBeenCalledTimes(17); // Corresponds exactly to the number of exec calls in the source code
});

test("logs error paths when tools are missing", async () => {
  process.env.NODE_ENV = "production";
  // Trigger a few error paths ("perl" is the msgconvert version lookup)
  process.env.MOCK_EXEC_ERROR = "pandoc,resvg,bun,perl";
  consoleLogSpy = spyOn(console, "log");
  consoleErrorSpy = spyOn(console, "error");

  await import("../../src/helpers/printVersions?test=" + Math.random());
  await new Promise((resolve) => setImmediate(resolve));

  expect(consoleErrorSpy).toHaveBeenCalled();
  expect(consoleErrorSpy).toHaveBeenCalledWith("Pandoc is not installed.");
  expect(consoleErrorSpy).toHaveBeenCalledWith("resvg is not installed");
  expect(consoleErrorSpy).toHaveBeenCalledWith("Bun is not installed. wait what");
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "msgconvert (libemail-outlook-message-perl) is not installed",
  );
});

test("processes output parsing correctly and logs no errors in the success case", async () => {
  process.env.NODE_ENV = "production";
  consoleLogSpy = spyOn(console, "log");
  consoleErrorSpy = spyOn(console, "error");

  // import module under test after setting NODE_ENV and activating the spies
  await import("../../src/helpers/printVersions?test=" + Math.random());

  await new Promise((resolve) => setImmediate(resolve));

  // testing some specific outputs
  expect(consoleLogSpy).toHaveBeenCalledWith("pandoc -v v1.0.0");
  expect(consoleLogSpy).toHaveBeenCalledWith("ffmpeg -version v1.0.0");
  expect(consoleLogSpy).toHaveBeenCalledWith("resvg v1.0.0");
  expect(consoleLogSpy).toHaveBeenCalledWith("Bun v1.0.0");
  expect(consoleLogSpy).toHaveBeenCalledWith("dasel 1.0.0");
  expect(consoleLogSpy).toHaveBeenCalledWith("msgconvert v1.0.0");

  // make sure that error paths have not been triggered
  expect(consoleErrorSpy).not.toHaveBeenCalled();
});
