import { afterEach, beforeEach, expect, test } from "bun:test";
import { convert } from "../../src/converters/libreoffice";
import type { ExecFileFn } from "../../src/converters/types";
import { filters, getFilters } from "../../src/converters/libreoffice";

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
    "--infilter=MS Word 2007 XML",
    "--convert-to",
    "odt:writer8",
    "--outdir",
    "out",
    "in.docx",
  ]);
});

test("uses writer_pdf_import and a text outFilter for pdf -> txt", async () => {
  await convert("in.pdf", "pdf", "txt", "out/out.txt", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).toEqual([
    "--headless",
    "--infilter=writer_pdf_import",
    "--convert-to",
    "txt:Text",
    "--outdir",
    "out",
    "in.pdf",
  ]);
});

test("uses no filters at all when converting to pdf (e.g., docx -> pdf)", async () => {
  await convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).toEqual(["--headless", "--convert-to", "pdf", "--outdir", "out", "in.docx"]);
});

test("does not force an infilter for wps (Microsoft Works, not MS Word 97)", async () => {
  // Regression test for https://github.com/C4illin/ConvertX/issues/582 -
  // forcing --infilter="MS Word 97" on a genuine .wps file makes soffice
  // reject it with "source file could not be loaded". No forced infilter
  // lets LibreOffice auto-detect the real format instead.
  await convert("in.wps", "wps", "docx", "out/out.docx", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).toEqual([
    "--headless",
    "--convert-to",
    "docx:MS Word 2007 XML",
    "--outdir",
    "out",
    "in.wps",
  ]);
  expect(args.some((a) => a.startsWith("--infilter"))).toBe(false);
});

test("does not force an outfilter for wps as an export target either", async () => {
  // wps shares one filter-map entry for both directions (see the comment in
  // libreoffice.ts) - docx's own infilter is still emitted (that describes
  // the real source file), but no --convert-to wps:<filter> suffix is
  // forced. Verified against a real soffice: this exact invocation succeeds,
  // with LibreOffice's default export filter for .wps ("MS Word 97" - the
  // same filter the map pinned before this change, so output is unchanged).
  // LibreOffice has no Works export filter, so no suffix could do better.
  await convert("in.docx", "docx", "wps", "out/out.wps", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).toEqual([
    "--headless",
    "--infilter=MS Word 2007 XML",
    "--convert-to",
    "wps",
    "--outdir",
    "out",
    "in.docx",
  ]);
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
  await expect(
    convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile),
  ).resolves.toBe("Done");
});

test("rejects when execFile returns an error", async () => {
  behavior = { kind: "error", message: "convert failed", stderr: "oops" };
  await expect(
    convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile),
  ).rejects.toMatch(/error: Error: convert failed/);
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

  await expect(
    convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile),
  ).rejects.toMatch(/error: Error: boom/);

  // The callback still provided stderr; your implementation logs it before settling
  expect(errors).toContain("stderr: EPIPE");
});

// --- spreadsheet (calc) conversions ------------------------------------------
test.each([
  {
    fileType: "csv",
    convertTo: "xlsx",
    infilter: "Text - txt - csv (StarCalc)",
    convertToArg: "xlsx:Calc MS Excel 2007 XML",
  },
  {
    fileType: "ods",
    convertTo: "xlsx",
    infilter: "calc8",
    convertToArg: "xlsx:Calc MS Excel 2007 XML",
  },
  {
    fileType: "xlsx",
    convertTo: "ods",
    infilter: "Calc MS Excel 2007 XML",
    convertToArg: "ods:calc8",
  },
  {
    fileType: "xls",
    convertTo: "xlsm",
    infilter: "MS Excel 97",
    convertToArg: "xlsm:Calc MS Excel 2007 XML VBA",
  },
])(
  "uses calc filters for $fileType -> $convertTo",
  async ({ fileType, convertTo, infilter, convertToArg }) => {
    await convert(
      `in.${fileType}`,
      fileType,
      convertTo,
      `out/out.${convertTo}`,
      undefined,
      mockExecFile,
    );

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");

    expect(args).toEqual([
      "--headless",
      `--infilter=${infilter}`,
      "--convert-to",
      convertToArg,
      "--outdir",
      "out",
      `in.${fileType}`,
    ]);
  },
);

test("uses no filters for a spreadsheet converted to pdf", async () => {
  await convert("in.xlsx", "xlsx", "pdf", "out/out.pdf", undefined, mockExecFile);

  const { args } = requireDefined(calls[0], "Expected at least one execFile call");

  expect(args).toEqual(["--headless", "--convert-to", "pdf", "--outdir", "out", "in.xlsx"]);
});

// --- getFilters (test-only export) -------------------------------------------
test("getFilters returns text filters when both formats are text formats", () => {
  expect(getFilters("doc", "odt")).toEqual(["MS Word 97", "writer8"]);
});

test("getFilters falls back to calc filters when the source is not a text format", () => {
  expect(getFilters("xls", "csv")).toEqual(["MS Excel 97", "Text - txt - csv (StarCalc)"]);
});

test.each([
  ["docx", "xlsx"],
  ["xlsx", "docx"],
  ["unknown", "odt"],
  ["docx", "unknown"],
])("getFilters returns no filters for unrelated formats (%s -> %s)", (fileType, convertTo) => {
  expect(getFilters(fileType, convertTo)).toEqual([null, null]);
});

test("getFilters keeps wps deliberately unmapped instead of falling through to calc", () => {
  expect("wps" in filters.text).toBe(true);
  expect(filters.text.wps).toBeNull();
  expect(getFilters("wps", "docx")).toEqual([null, "MS Word 2007 XML"]);
});
