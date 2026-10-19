import { expect } from "bun:test";
import type { ConvertFnWithExecFile, ExecFileFn } from "../../../src/converters/types";

type ExecFileCall = { cmd: string; args: string[] };

/**
 * Creates an execFile replacement that records every invocation and answers with the
 * given error/stdout/stderr, so converter tests never spawn real binaries.
 */
export function createMockExecFile({
  error = null,
  stdout = "",
  stderr = "",
}: { error?: Error | null; stdout?: string; stderr?: string } = {}) {
  const calls: ExecFileCall[] = [];
  const execFile: ExecFileFn = (cmd, args, callback) => {
    calls.push({ cmd, args });
    callback(error, stdout, stderr);
  };
  return { execFile, calls };
}

/**
 * Redirects console.log/error/warn into arrays so tests can assert on them without
 * printing to the terminal. Always call restore() afterwards (e.g. in afterEach).
 */
export function captureConsole() {
  const original = { log: console.log, error: console.error, warn: console.warn };
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const sink =
    (target: string[]): Console["log"] =>
    (...data) => {
      target.push(data.map(String).join(" "));
    };

  console.log = sink(logs);
  console.error = sink(errors);
  console.warn = sink(warnings);

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
    },
  };
}

export async function runConvertSuccessTest(convertFn: ConvertFnWithExecFile) {
  const output = captureConsole();
  const { execFile, calls } = createMockExecFile({ stdout: "Fake stdout" });

  try {
    const result = await convertFn("input.obj", "obj", "stl", "output.stl", undefined, execFile);

    expect(result).toBe("Done");
    expect(calls).toHaveLength(1);
    expect(output.logs).toEqual(["stdout: Fake stdout"]);
    expect(output.errors).toEqual([]);
  } finally {
    output.restore();
  }
}

export async function runConvertFailTest(convertFn: ConvertFnWithExecFile) {
  const failures: [error: unknown, expected: RegExp][] = [
    [new Error("Test error"), /error: Error: Test error/],
    // non-standard error object lacking a 'message' property
    [{ notMessage: true }, /error:/i],
    // non-object error (e.g., a string)
    ["string error", /error:/i],
  ];

  for (const [error, expected] of failures) {
    const { execFile } = createMockExecFile({ error: error as Error });

    await expect(
      convertFn("input.obj", "obj", "stl", "output.stl", undefined, execFile),
    ).rejects.toMatch(expected);
  }
}

export async function runConvertLogsStderror(convertFn: ConvertFnWithExecFile) {
  const output = captureConsole();
  const { execFile } = createMockExecFile({ stderr: "Fake stderr" });

  try {
    await convertFn("file.obj", "obj", "stl", "out.stl", undefined, execFile);

    expect(output.errors).toEqual(["stderr: Fake stderr"]);
    expect(output.logs).toEqual([]);
  } finally {
    output.restore();
  }
}

export async function runConvertLogsStderrorAndStdout(convertFn: ConvertFnWithExecFile) {
  const output = captureConsole();
  const { execFile } = createMockExecFile({ stdout: "Fake stdout", stderr: "Fake stderr" });

  try {
    await convertFn("file.obj", "obj", "stl", "out.stl", undefined, execFile);

    expect(output.errors).toEqual(["stderr: Fake stderr"]);
    expect(output.logs).toEqual(["stdout: Fake stdout"]);
  } finally {
    output.restore();
  }
}

export async function runConvertLogsNothingWithoutOutput(convertFn: ConvertFnWithExecFile) {
  const output = captureConsole();
  const { execFile } = createMockExecFile();

  try {
    await convertFn("file.obj", "obj", "stl", "out.stl", undefined, execFile);

    expect(output.logs).toEqual([]);
    expect(output.errors).toEqual([]);
  } finally {
    output.restore();
  }
}
