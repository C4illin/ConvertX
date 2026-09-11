import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSandboxedExec,
  getLandlockRunnerPath,
  isSandboxAvailable,
  resetCachedRunnerPath,
} from "../../src/helpers/sandbox";

const originalEnv = { ...process.env };

beforeEach(() => {
  resetCachedRunnerPath();
  delete process.env.SANDBOX_DISABLED;
  delete process.env.SANDBOX_STRICT;
  delete process.env.LANDLOCK_RUNNER_PATH;
});

afterEach(() => {
  resetCachedRunnerPath();
  process.env = { ...originalEnv };
});

test("isSandboxAvailable returns false when SANDBOX_DISABLED is true", () => {
  process.env.SANDBOX_DISABLED = "true";
  expect(isSandboxAvailable()).toBe(false);
  expect(getLandlockRunnerPath()).toBeNull();
});

test("getLandlockRunnerPath respects LANDLOCK_RUNNER_PATH if it exists", () => {
  const runner = getLandlockRunnerPath();
  if (runner) {
    process.env.LANDLOCK_RUNNER_PATH = runner;
    resetCachedRunnerPath();
    expect(getLandlockRunnerPath()).toBe(runner);
  }
});

test("createSandboxedExec sets TMPDIR and HOME in environment", async () => {
  const testDir = join(tmpdir(), `sandbox-test-env-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const inputDir = join(testDir, "input");
  const outputDir = join(testDir, "output");
  const tempDir = join(testDir, "temp");
  mkdirSync(inputDir);
  mkdirSync(outputDir);
  mkdirSync(tempDir);

  const sandboxedExec = createSandboxedExec({
    inputDir,
    outputDir,
    tempDir,
  });

  const stdout = await new Promise<string>((resolve, reject) => {
    sandboxedExec("/bin/sh", ["-c", 'echo "$TMPDIR $HOME"'], (err, out) => {
      if (err) {
        reject(err);
      } else {
        resolve(String(out));
      }
    });
  });

  expect(stdout.trim()).toBe(`${tempDir} ${tempDir}`);

  rmSync(testDir, { recursive: true, force: true });
});

test("createSandboxedExec handles SANDBOX_STRICT when runner is missing", async () => {
  process.env.SANDBOX_DISABLED = "true";
  process.env.SANDBOX_STRICT = "true";

  const sandboxedExec = createSandboxedExec({
    inputDir: "/tmp/in",
    outputDir: "/tmp/out",
    tempDir: "/tmp/temp",
  });

  let errorCaptured: Error | null = null;
  sandboxedExec("some-cmd", ["arg"], (err) => {
    errorCaptured = err;
  });

  expect(errorCaptured).not.toBeNull();
  expect(errorCaptured?.message).toContain("SANDBOX_STRICT is enabled");
});

test("createSandboxedExec passes options before callback correctly", async () => {
  const testDir = join(tmpdir(), `sandbox-test-opts-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const sandboxedExec = createSandboxedExec({
    inputDir: testDir,
    outputDir: testDir,
    tempDir: testDir,
  });

  let called = false;
  await new Promise<void>((resolve) => {
    sandboxedExec("echo", ["hi"], { maxBuffer: 1024 }, () => {
      called = true;
      resolve();
    });
  });

  expect(called).toBe(true);

  rmSync(testDir, { recursive: true, force: true });
});

test("landlock-runner enforces real sandboxing when available", async () => {
  const runnerPath = getLandlockRunnerPath();
  if (!runnerPath) {
    // Skip if landlock is not built/available on host
    return;
  }

  const testDir = join(tmpdir(), `landlock-real-test-${Date.now()}`);
  const inputDir = join(testDir, "input");
  const outputDir = join(testDir, "output");
  const tempDir = join(testDir, "temp");

  mkdirSync(inputDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });

  const inputFile = join(inputDir, "sample.txt");
  const outputFile = join(outputDir, "out.txt");
  writeFileSync(inputFile, "content from input");

  const sandboxedExec = createSandboxedExec({
    inputDir,
    outputDir,
    tempDir,
  });

  // 1. Reading from inputDir and writing to outputDir must SUCCEED
  const success = await new Promise<boolean>((resolve) => {
    sandboxedExec("/bin/sh", ["-c", `cat "${inputFile}" > "${outputFile}"`], (err) => {
      resolve(!err);
    });
  });

  expect(success).toBe(true);
  expect(existsSync(outputFile)).toBe(true);

  // 2. Writing to unpermitted directory outside /tmp (e.g. workspace root) must FAIL
  const forbiddenFile = join(process.cwd(), `test-forbidden-${Date.now()}.txt`);
  const failure = await new Promise<boolean>((resolve) => {
    sandboxedExec("/bin/sh", ["-c", `echo "should fail" > "${forbiddenFile}"`], (err) => {
      resolve(!!err);
    });
  });

  expect(failure).toBe(true);
  expect(existsSync(forbiddenFile)).toBe(false);

  // 3. Creating symlinks in outputDir must be blocked (Permission denied)
  const symlinkTarget = "/etc/passwd";
  const symlinkFile = join(outputDir, "symlink-test");
  const symlinkFailed = await new Promise<boolean>((resolve) => {
    sandboxedExec("/bin/ln", ["-s", symlinkTarget, symlinkFile], (err) => {
      resolve(!!err);
    });
  });

  expect(symlinkFailed).toBe(true);
  expect(existsSync(symlinkFile)).toBe(false);

  // 4. Network operations must be blocked (Permission denied)
  const netBlocked = await new Promise<boolean>((resolve) => {
    sandboxedExec(
      "/usr/bin/python3",
      ["-c", "import socket; s = socket.socket(); s.connect(('127.0.0.1', 80))"],
      (err) => {
        resolve(!!err);
      },
    );
  });

  expect(netBlocked).toBe(true);

  rmSync(testDir, { recursive: true, force: true });
});
