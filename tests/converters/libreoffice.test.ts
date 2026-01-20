import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { convert, type ExistsSyncFn } from "../../src/converters/libreoffice";
import type { ExecFileFn } from "../../src/converters/types";

function requireDefined<T>(value: T, msg: string): NonNullable<T> {
  if (value === undefined || value === null) throw new Error(msg);
  return value as NonNullable<T>;
}

// --- capture/inspect execFile calls -----------------------------------------
type Call = { cmd: string; args: string[] };
let calls: Call[] = [];

let behavior:
  | { kind: "success"; stdout?: string; stderr?: string }
  | { kind: "error"; message?: string; stderr?: string; code?: string } = { kind: "success" };

// Mock fs.existsSync to control output file existence check
let mockFileExists = true;

const mockExistsSync: ExistsSyncFn = () => mockFileExists;

const mockExecFile: ExecFileFn = (cmd, args, cb) => {
  calls.push({ cmd, args });
  if (behavior.kind === "error") {
    const error = new Error(behavior.message ?? "mock failure") as Error & { code?: string };
    if (behavior.code) error.code = behavior.code;
    cb(error, "", behavior.stderr ?? "");
  } else {
    cb(null, behavior.stdout ?? "ok", behavior.stderr ?? "");
  }
  return undefined;
};

// --- capture console output (no terminal noise) ------------------------------
let logs: string[] = [];
let errors: string[] = [];

const originalLog = console.log;
const originalError = console.error;

const makeSink =
  (sink: string[]): Console["log"] =>
  (...data) => {
    sink.push(data.map(String).join(" "));
  };

beforeEach(() => {
  calls = [];
  behavior = { kind: "success" };
  mockFileExists = true;

  logs = [];
  errors = [];
  console.log = makeSink(logs);
  console.error = makeSink(errors);
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

// ==============================================================================
// PDF → DOCX (Import Pipeline) 測試
// ==============================================================================
describe("PDF Import Pipeline", () => {
  test("PDF → DOCX uses writer_pdf_import filter", async () => {
    await convert("in.pdf", "pdf", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync);

    const { cmd, args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(cmd).toBe("soffice");
    expect(args).toContain("--infilter=writer_pdf_import");
    expect(args).toContain("--convert-to");

    // 驗證輸出格式包含正確的 filter
    const convertToIdx = args.indexOf("--convert-to");
    expect(args[convertToIdx + 1]).toBe("docx:MS Word 2007 XML");
  });

  test("PDF → ODT uses writer_pdf_import filter", async () => {
    await convert("in.pdf", "pdf", "odt", "out/out.odt", undefined, mockExecFile, mockExistsSync);

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(args).toContain("--infilter=writer_pdf_import");

    const convertToIdx = args.indexOf("--convert-to");
    expect(args[convertToIdx + 1]).toBe("odt:writer8");
  });

  test("PDF → RTF uses writer_pdf_import filter", async () => {
    await convert("in.pdf", "pdf", "rtf", "out/out.rtf", undefined, mockExecFile, mockExistsSync);

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(args).toContain("--infilter=writer_pdf_import");
  });

  test("PDF → TXT uses writer_pdf_import filter", async () => {
    await convert("in.pdf", "pdf", "txt", "out/out.txt", undefined, mockExecFile, mockExistsSync);

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(args).toContain("--infilter=writer_pdf_import");
  });
});

// ==============================================================================
// 一般轉換流程（Export Pipeline）測試
// ==============================================================================
describe("Export Pipeline", () => {
  test("DOCX → PDF uses normal export pipeline (no infilter)", async () => {
    await convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync);

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");

    // DOCX → PDF 不應該使用 PDF import filter
    expect(args).not.toContain("--infilter=writer_pdf_import");
    expect(args).toContain("--convert-to");

    const convertToIdx = args.indexOf("--convert-to");
    expect(args[convertToIdx + 1]).toBe("pdf:writer_pdf_Export");
  });

  test("DOCX → ODT uses correct filters", async () => {
    await convert("in.docx", "docx", "odt", "out/out.odt", undefined, mockExecFile, mockExistsSync);

    const { cmd, args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(cmd).toBe("soffice");

    // 應該有 infilter 和 outfilter
    expect(args).toContain("--infilter=MS Word 2007 XML");

    const convertToIdx = args.indexOf("--convert-to");
    expect(args[convertToIdx + 1]).toBe("odt:writer8");
  });

  test("ODT → PDF uses export pipeline", async () => {
    await convert("in.odt", "odt", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync);

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");
    expect(args).not.toContain("--infilter=writer_pdf_import");
  });
});

// ==============================================================================
// 輸出檔案驗證測試
// ==============================================================================
describe("Output File Verification", () => {
  test("resolves with 'Done' when output file exists", async () => {
    mockFileExists = true;
    behavior = { kind: "success", stdout: "Conversion completed", stderr: "" };

    await expect(
      convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync),
    ).resolves.toBe("Done");
  });

  test("rejects when output file does not exist", async () => {
    mockFileExists = false;
    behavior = { kind: "success", stdout: "", stderr: "" };

    await expect(
      convert("in.pdf", "pdf", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/輸出檔案不存在/);
  });

  test("rejects when execFile returns an error", async () => {
    behavior = { kind: "error", message: "convert failed", stderr: "oops" };

    await expect(
      convert("in.txt", "txt", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/LibreOffice 轉換失敗/);
  });
});

// ==============================================================================
// 錯誤訊息測試
// ==============================================================================
describe("Error Messages", () => {
  test("provides helpful message for 'no export filter' error", async () => {
    behavior = { kind: "error", message: "failed", stderr: "Error: no export filter for this" };

    await expect(
      convert("in.pdf", "pdf", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/找不到 export filter/);
  });

  test("provides helpful message for password-protected files", async () => {
    behavior = { kind: "error", message: "failed", stderr: "password required" };

    await expect(
      convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/加密|密碼/);
  });

  test("provides helpful message for corrupt files", async () => {
    behavior = { kind: "error", message: "failed", stderr: "file is corrupt" };

    await expect(
      convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/損壞|無效/);
  });

  test("provides helpful message when soffice not found", async () => {
    behavior = { kind: "error", message: "ENOENT", stderr: "", code: "ENOENT" };

    await expect(
      convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync),
    ).rejects.toMatch(/找不到 soffice/);
  });
});

// ==============================================================================
// 路徑處理測試
// ==============================================================================
describe("Path Handling", () => {
  test("strips leading './' from outdir", async () => {
    await convert(
      "in.txt",
      "txt",
      "docx",
      "./out/out.docx",
      undefined,
      mockExecFile,
      mockExistsSync,
    );

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");

    const outDirIdx = args.indexOf("--outdir");
    expect(outDirIdx).toBeGreaterThanOrEqual(0);
    expect(args[outDirIdx + 1]).toBe("out");
  });

  test("handles nested output directories", async () => {
    await convert(
      "in.txt",
      "txt",
      "docx",
      "a/b/c/out.docx",
      undefined,
      mockExecFile,
      mockExistsSync,
    );

    const { args } = requireDefined(calls[0], "Expected at least one execFile call");

    const outDirIdx = args.indexOf("--outdir");
    expect(args[outDirIdx + 1]).toBe("a/b/c");
  });
});

// ==============================================================================
// 日誌測試
// ==============================================================================
describe("Logging", () => {
  test("logs command being executed", async () => {
    await convert("in.pdf", "pdf", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync);

    expect(logs.some((l) => l.includes("[LibreOffice] Command:"))).toBe(true);
  });

  test("logs when using PDF import pipeline", async () => {
    await convert("in.pdf", "pdf", "docx", "out/out.docx", undefined, mockExecFile, mockExistsSync);

    expect(logs.some((l) => l.includes("PDF import pipeline"))).toBe(true);
  });

  test("logs successful conversion", async () => {
    mockFileExists = true;
    await convert("in.docx", "docx", "pdf", "out/out.pdf", undefined, mockExecFile, mockExistsSync);

    expect(logs.some((l) => l.includes("Successfully created"))).toBe(true);
  });
});
