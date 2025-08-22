import { afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/libreoffice"; // ← adjust
import type { ExecFileFn } from "../../src/converters/types"; // ← adjust

function requireDefined<T>(value: T, msg: string): NonNullable<T> {
  if (value === undefined || value === null) throw new Error(msg);
  return value as NonNullable<T>;
}

// --- capture/inspect execFile calls -----------------------------------------
type Call = { cmd: string; args: string[] };
let calls: Call[] = [];

let behavior:
  | { kind: "success"; stdout?: string; stderr?: string }
  | { kind: "error"; message?: string; stderr?: string } = { kind: "success" };

const mockExecFile: ExecFileFn = (cmd, args, cb) => {
  calls.push({ cmd, args });
  if (behavior.kind === "error") {
    cb(new Error(behavior.message ?? "mock failure"), "", behavior.stderr ?? "");
  } else {
    cb(null, behavior.stdout ?? "ok", behavior.stderr ?? "");
  }
  // We don't return a real ChildProcess in tests.
  return undefined;
};

// --- capture console output (no terminal noise) ------------------------------
let logs: string[] = [];
let errors: string[] = [];

const originalLog = console.log;
const originalError = console.error;

// Use Console["log"] for typing; avoids explicit `any`
const makeSink =
  (sink: string[]): Console["log"] =>
  (...data) => {
    sink.push(data.map(String).join(" "));
  };

beforeEach(() => {
  calls = [];
  behavior = { kind: "success" };

  logs = [];
  errors = [];
  console.log = makeSink(logs);
  console.error = makeSink(errors);
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

// --- core behavior -----------------------------------------------------------
test("invokes soffice with --headless and outdir derived from targetPath", async () => {
  await convert("in.docx", "docx", "odt", "out/out.odt", undefined, mockExecFile);

  const { cmd, args } = requireDefined(calls[0], "Expected at least one execFile call");
  expect(cmd).toBe("soffice");
  expect(args).toEqual([
    "--headless",
    `--infilter="MS Word 2007 XML"`,
    "--convert-to",
    "odt:writer8",
    "--outdir",
    "out",
    "in.docx",
  ]);
});

test("uses only outFilter when input has no filter (e.g., pdf -> txt)", async () => {
  await convert("in.pdf", "pdf", "txt", "out/out.txt", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).not.toContainEqual(expect.stringMatching(/^--infilter=/));
  expect(args).toEqual(["--headless", "--convert-to", "txt", "--outdir", "out", "in.pdf"]);
});

test("uses only infilter when convertTo has no out filter (e.g., docx -> pdf)", async () => {
  await convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  // If docx has an infilter, it should be present
  expect(args).toEqual(["--headless", "--convert-to", "pdf", "--outdir", "out", "in.docx"]);

  const i = args.indexOf("--convert-to");
  expect(i).toBeGreaterThanOrEqual(0);
  expect(args[i + 1]).toBe("pdf");
  expect(args.slice(-2)).toEqual(["out", "in.docx"]);
});

test("strips leading './' from outdir", async () => {
  await convert("in.txt", "txt", "docx", "./out/out.docx", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  const outDirIdx = args.indexOf("--outdir");
  expect(outDirIdx).toBeGreaterThanOrEqual(0);
  expect(args[outDirIdx + 1]).toBe("out");
});

// --- promise settlement ------------------------------------------------------
test("resolves with 'Done' when execFile succeeds", async () => {
  behavior = { kind: "success", stdout: "fine", stderr: "" };
  expect(convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile)).resolves.toBe(
    "Done",
  );
});

test("rejects when execFile returns an error", async () => {
  behavior = { kind: "error", message: "convert failed", stderr: "oops" };
  expect(convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile)).rejects.toMatch(
    /error: Error: convert failed/,
  );
});

// --- logging behavior --------------------------------------------------------
test("logs stdout when present", async () => {
  behavior = { kind: "success", stdout: "hello", stderr: "" };

  await convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile);

  expect(logs).toContain("stdout: hello");
  expect(errors).toHaveLength(0);
});

test("logs stderr when present", async () => {
  behavior = { kind: "success", stdout: "", stderr: "uh-oh" };

  await convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile);

  expect(errors).toContain("stderr: uh-oh");
  // When stdout is empty, no stdout log
  expect(logs.find((l) => l.startsWith("stdout:"))).toBeUndefined();
});

test("logs both stdout and stderr when both are present", async () => {
  behavior = { kind: "success", stdout: "alpha", stderr: "beta" };

  await convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile);

  expect(logs).toContain("stdout: alpha");
  expect(errors).toContain("stderr: beta");
});

test("logs stderr on exec error as well", async () => {
  behavior = { kind: "error", message: "boom", stderr: "EPIPE" };

  expect(convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile)).rejects.toMatch(
    /error: Error: boom/,
  );

  // The callback still provided stderr; your implementation logs it before settling
  expect(errors).toContain("stderr: EPIPE");
});
