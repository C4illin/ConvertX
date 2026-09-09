import {
  execFile as execFileOriginal,
  type ChildProcess,
  type ExecFileOptions,
} from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecFileCallback, ExecFileFn } from "../converters/types";

export interface SandboxConfig {
  inputDir: string;
  outputDir: string;
  tempDir: string;
  allowNet?: boolean;
}

let cachedRunnerPath: string | null | undefined = undefined;

/**
 * Locate the landlock-runner binary if available.
 */
export function getLandlockRunnerPath(): string | null {
  if (cachedRunnerPath !== undefined) {
    return cachedRunnerPath;
  }

  if (process.env.SANDBOX_DISABLED === "true") {
    cachedRunnerPath = null;
    return null;
  }

  if (process.platform !== "linux") {
    cachedRunnerPath = null;
    return null;
  }

  if (process.env.LANDLOCK_RUNNER_PATH && existsSync(process.env.LANDLOCK_RUNNER_PATH)) {
    cachedRunnerPath = process.env.LANDLOCK_RUNNER_PATH;
    return cachedRunnerPath;
  }

  const candidatePaths = [
    "/usr/local/bin/landlock-runner",
    resolve(process.cwd(), "bin/landlock-runner"),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      cachedRunnerPath = candidate;
      return cachedRunnerPath;
    }
  }

  cachedRunnerPath = null;
  return null;
}

/**
 * Reset the cached runner path (primarily for testing).
 */
export function resetCachedRunnerPath(): void {
  cachedRunnerPath = undefined;
}

/**
 * Returns true if Landlock sandboxing is supported and enabled.
 */
export function isSandboxAvailable(): boolean {
  return getLandlockRunnerPath() !== null;
}

const DEFAULT_SYSTEM_RO = "/usr:/lib:/lib64:/bin:/sbin:/etc:/proc:/var";

/**
 * Create a sandboxed execFile function configured for a specific conversion job.
 */
export function createSandboxedExec(config: SandboxConfig): ExecFileFn {
  const runnerPath = getLandlockRunnerPath();
  const isStrict = process.env.SANDBOX_STRICT === "true";

  const resolvedInput = resolve(config.inputDir);
  const resolvedOutput = resolve(config.outputDir);
  const resolvedTemp = resolve(config.tempDir);

  const sandboxedExec = ((
    cmd: string,
    args: string[],
    optionsOrCallback?: ExecFileOptions | ExecFileCallback,
    callbackOrOptions?: ExecFileOptions | ExecFileCallback,
  ): ChildProcess | void => {
    let options: ExecFileOptions = {};
    let callback: ExecFileCallback | undefined;

    if (typeof optionsOrCallback === "function") {
      callback = optionsOrCallback;
      if (typeof callbackOrOptions === "object" && callbackOrOptions !== null) {
        options = callbackOrOptions;
      }
    } else {
      if (typeof optionsOrCallback === "object" && optionsOrCallback !== null) {
        options = optionsOrCallback;
      }
      if (typeof callbackOrOptions === "function") {
        callback = callbackOrOptions;
      }
    }

    const cb: ExecFileCallback = callback ?? (() => {});

    if (!runnerPath) {
      if (isStrict) {
        const error = new Error(
          "SANDBOX_STRICT is enabled, but landlock-runner is not available on this system.",
        );
        cb(error, "", error.message);
        return;
      }
      return (
        execFileOriginal as (
          c: string,
          a: string[],
          o: ExecFileOptions,
          f: ExecFileCallback,
        ) => ChildProcess
      )(cmd, args, options, cb);
    }

    // Build landlock-runner arguments
    const runnerArgs: string[] = [
      "--ro",
      DEFAULT_SYSTEM_RO,
      "--ro",
      resolvedInput,
      "--rw",
      resolvedOutput,
      "--rw",
      `${resolvedTemp}:/tmp:/dev`,
    ];

    if (!config.allowNet) {
      runnerArgs.push("--no-net");
    }

    if (isStrict) {
      runnerArgs.push("--strict");
    }

    runnerArgs.push("--", cmd, ...args);

    // Provide isolated per-job TMPDIR, HOME, and XDG directories
    const sandboxedEnv = {
      ...process.env,
      ...options.env,
      TMPDIR: resolvedTemp,
      TEMP: resolvedTemp,
      TMP: resolvedTemp,
      HOME: resolvedTemp,
      XDG_CONFIG_HOME: `${resolvedTemp}/.config`,
      XDG_CACHE_HOME: `${resolvedTemp}/.cache`,
      XDG_DATA_HOME: `${resolvedTemp}/.local/share`,
    };

    const sandboxedOptions: ExecFileOptions = {
      ...options,
      env: sandboxedEnv,
    };

    return (
      execFileOriginal as (
        c: string,
        a: string[],
        o: ExecFileOptions,
        f: ExecFileCallback,
      ) => ChildProcess
    )(runnerPath, runnerArgs, sandboxedOptions, cb);
  }) as unknown as ExecFileFn;

  return sandboxedExec;
}
