import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import {
  convert,
  properties,
  parseChip,
  isArchiveOutput,
  getOutputFileName,
  ALL_CHIPS,
} from "../../src/converters/pdfpackager";
import type { ExecFileException } from "node:child_process";
import type { ExecFileFn } from "../../src/converters/types";
import { mkdirSync, existsSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// 屬性測試
// =============================================================================

describe("PDF Packager converter properties", () => {
  test("should have correct input format (pdf only)", () => {
    expect(properties.from.document).toContain("pdf");
    expect(properties.from.document).toHaveLength(1);
  });

  test("should have all chips as output formats", () => {
    expect(properties.to.document).toHaveLength(ALL_CHIPS.length);

    // 驗證部分代表性 chips
    expect(properties.to.document).toContain("png-300");
    expect(properties.to.document).toContain("pdf-600-np-s");
    expect(properties.to.document).toContain("pdfa1b-i-300-p");
    expect(properties.to.document).toContain("pdfa2b-o-600");
    expect(properties.to.document).toContain("all-300");
  });

  test("should have correct number of chips (102 total)", () => {
    // A) 圖片: 3格式 × 3dpi = 9
    // B) PDF: 3dpi × 6 variants = 18
    // C) PDF/A-1b: 2source × 3dpi × 6 = 36
    // D) PDF/A-2b: 2source × 3dpi × 6 = 36
    // E) all: 3
    // 總計: 9 + 18 + 36 + 36 + 3 = 102
    expect(ALL_CHIPS.length).toBe(102);
  });
});

// =============================================================================
// Chip 解析測試
// =============================================================================

describe("parseChip function", () => {
  describe("images chips", () => {
    test("should parse png-300", () => {
      const result = parseChip("png-300");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("images");
      expect(result?.dpi).toBe(300);
      expect(result?.imageFormat).toBe("png");
    });

    test("should parse jpg-150", () => {
      const result = parseChip("jpg-150");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("images");
      expect(result?.dpi).toBe(150);
      expect(result?.imageFormat).toBe("jpg");
    });

    test("should parse jpeg-600", () => {
      const result = parseChip("jpeg-600");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("images");
      expect(result?.dpi).toBe(600);
      expect(result?.imageFormat).toBe("jpeg");
    });
  });

  describe("pdf_image chips", () => {
    test("should parse pdf-300", () => {
      const result = parseChip("pdf-300");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdf_image");
      expect(result?.dpi).toBe(300);
      expect(result?.protect).toBeUndefined();
      expect(result?.sign).toBe(false);
    });

    test("should parse pdf-300-p", () => {
      const result = parseChip("pdf-300-p");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdf_image");
      expect(result?.dpi).toBe(300);
      expect(result?.protect).toBe("p");
      expect(result?.sign).toBe(false);
    });

    test("should parse pdf-600-np-s", () => {
      const result = parseChip("pdf-600-np-s");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdf_image");
      expect(result?.dpi).toBe(600);
      expect(result?.protect).toBe("np");
      expect(result?.sign).toBe(true);
    });

    test("should parse pdf-150-s (sign without protect)", () => {
      const result = parseChip("pdf-150-s");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdf_image");
      expect(result?.dpi).toBe(150);
      expect(result?.protect).toBeUndefined();
      expect(result?.sign).toBe(true);
    });
  });

  describe("pdfa chips", () => {
    test("should parse pdfa1b-i-300", () => {
      const result = parseChip("pdfa1b-i-300");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdfa");
      expect(result?.pdfaLevel).toBe("1b");
      expect(result?.pdfaSource).toBe("i");
      expect(result?.dpi).toBe(300);
    });

    test("should parse pdfa2b-o-600-np-s", () => {
      const result = parseChip("pdfa2b-o-600-np-s");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdfa");
      expect(result?.pdfaLevel).toBe("2b");
      expect(result?.pdfaSource).toBe("o");
      expect(result?.dpi).toBe(600);
      expect(result?.protect).toBe("np");
      expect(result?.sign).toBe(true);
    });

    test("should parse pdfa1b-o-150-p", () => {
      const result = parseChip("pdfa1b-o-150-p");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("pdfa");
      expect(result?.pdfaLevel).toBe("1b");
      expect(result?.pdfaSource).toBe("o");
      expect(result?.dpi).toBe(150);
      expect(result?.protect).toBe("p");
    });
  });

  describe("all chips", () => {
    test("should parse all-300", () => {
      const result = parseChip("all-300");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("all");
      expect(result?.dpi).toBe(300);
    });

    test("should parse all-150", () => {
      const result = parseChip("all-150");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("all");
      expect(result?.dpi).toBe(150);
    });

    test("should parse all-600", () => {
      const result = parseChip("all-600");
      expect(result).not.toBeNull();
      expect(result?.kind).toBe("all");
      expect(result?.dpi).toBe(600);
    });
  });

  describe("invalid chips", () => {
    test("should return null for invalid chip", () => {
      expect(parseChip("invalid")).toBeNull();
      expect(parseChip("png-400")).toBeNull(); // invalid DPI
      expect(parseChip("pdf-300-x")).toBeNull(); // invalid protect
      expect(parseChip("pdfa3b-i-300")).toBeNull(); // invalid level
      expect(parseChip("all-300-p")).toBeNull(); // all doesn't support protect
    });
  });
});

// =============================================================================
// 輔助函式測試
// =============================================================================

describe("isArchiveOutput function", () => {
  test("should return true for image chips", () => {
    expect(isArchiveOutput("png-300")).toBe(true);
    expect(isArchiveOutput("jpg-600")).toBe(true);
    expect(isArchiveOutput("jpeg-150")).toBe(true);
  });

  test("should return true for all chips", () => {
    expect(isArchiveOutput("all-150")).toBe(true);
    expect(isArchiveOutput("all-300")).toBe(true);
    expect(isArchiveOutput("all-600")).toBe(true);
  });

  test("should return false for pdf chips", () => {
    expect(isArchiveOutput("pdf-300")).toBe(false);
    expect(isArchiveOutput("pdf-300-p")).toBe(false);
    expect(isArchiveOutput("pdf-600-np-s")).toBe(false);
  });

  test("should return false for pdfa chips", () => {
    expect(isArchiveOutput("pdfa1b-i-300")).toBe(false);
    expect(isArchiveOutput("pdfa2b-o-600-np-s")).toBe(false);
  });
});

describe("getOutputFileName function", () => {
  test("should return .tar for image chips", () => {
    expect(getOutputFileName("png-300")).toBe("pack_png-300.tar");
    expect(getOutputFileName("jpg-600")).toBe("pack_jpg-600.tar");
  });

  test("should return .tar for all chips", () => {
    expect(getOutputFileName("all-300")).toBe("pack_all-300.tar");
  });

  test("should return .pdf for pdf chips", () => {
    expect(getOutputFileName("pdf-300")).toBe("pack_pdf-300.pdf");
    expect(getOutputFileName("pdf-600-np-s")).toBe("pack_pdf-600-np-s.pdf");
  });

  test("should return .pdf for pdfa chips", () => {
    expect(getOutputFileName("pdfa1b-i-300")).toBe("pack_pdfa1b-i-300.pdf");
    expect(getOutputFileName("pdfa2b-o-600-np-s")).toBe("pack_pdfa2b-o-600-np-s.pdf");
  });
});

// =============================================================================
// 轉換測試（使用 mock execFile）
// =============================================================================

describe("PDF Packager convert function", () => {
  const testDir = "./test-output-pdfpackager";

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should process png-300 chip correctly", async () => {
    const commands: Array<{ cmd: string; args: string[] }> = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      commands.push({ cmd, args });

      if (cmd === "pdftoppm") {
        // Simulate creating image files
        const outputPrefix = args[args.length - 1];
        const outputDir = join(outputPrefix, "..");
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        writeFileSync(`${outputPrefix}-01.png`, "fake png content");
        writeFileSync(`${outputPrefix}-02.png`, "fake png content");
        callback(null, "", "");
      } else if (cmd === "tar") {
        // Simulate tar creation
        const outputTar = args[1]; // -cf <output>
        writeFileSync(outputTar, "fake tar content");
        callback(null, "", "");
      } else {
        callback(null, "", "");
      }
    };

    const inputPdf = join(testDir, "input.pdf");
    writeFileSync(inputPdf, "fake pdf content");

    const targetPath = join(testDir, "output");
    await convert(inputPdf, "pdf", "png-300", targetPath, undefined, mockExecFile);

    // Verify pdftoppm was called with correct arguments
    const pdftoppmCall = commands.find((c) => c.cmd === "pdftoppm");
    expect(pdftoppmCall).toBeDefined();
    expect(pdftoppmCall?.args).toContain("-r");
    expect(pdftoppmCall?.args).toContain("300");
    expect(pdftoppmCall?.args).toContain("-png");

    // Verify tar was called
    const tarCall = commands.find((c) => c.cmd === "tar");
    expect(tarCall).toBeDefined();
    expect(tarCall?.args).toContain("-cf");
  });

  test("should process pdf-300-np chip correctly (with qpdf)", async () => {
    const commands: Array<{ cmd: string; args: string[] }> = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      commands.push({ cmd, args });

      if (cmd === "pdftoppm") {
        const outputPrefix = args[args.length - 1];
        const outputDir = join(outputPrefix, "..");
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        writeFileSync(`${outputPrefix}-01.png`, "fake png");
        callback(null, "", "");
      } else if (cmd === "img2pdf") {
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1) {
          const outputPdf = args[outputIndex + 1];
          const outputDir = join(outputPdf, "..");
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPdf, "fake pdf");
        }
        callback(null, "", "");
      } else if (cmd === "qpdf") {
        const outputPdf = args[args.length - 1];
        writeFileSync(outputPdf, "fake protected pdf");
        callback(null, "", "");
      } else {
        callback(null, "", "");
      }
    };

    const inputPdf = join(testDir, "input.pdf");
    writeFileSync(inputPdf, "fake pdf content");

    const targetPath = join(testDir, "output");
    await convert(inputPdf, "pdf", "pdf-300-np", targetPath, undefined, mockExecFile);

    // Verify qpdf was called with no-print option
    const qpdfCall = commands.find((c) => c.cmd === "qpdf");
    expect(qpdfCall).toBeDefined();
    expect(qpdfCall?.args).toContain("--print=none");
    expect(qpdfCall?.args).toContain("--modify=none");
  });

  test("should process pdfa2b-o-300 chip correctly (from original)", async () => {
    const commands: Array<{ cmd: string; args: string[] }> = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      commands.push({ cmd, args });

      if (cmd === "gs") {
        // Find output file from args
        const outputArg = args.find((a) => a.startsWith("-sOutputFile="));
        if (outputArg) {
          const outputPdf = outputArg.replace("-sOutputFile=", "");
          const outputDir = join(outputPdf, "..");
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPdf, "fake pdfa pdf");
        }
        callback(null, "", "");
      } else {
        callback(null, "", "");
      }
    };

    const inputPdf = join(testDir, "input.pdf");
    writeFileSync(inputPdf, "fake pdf content");

    const targetPath = join(testDir, "output");
    await convert(inputPdf, "pdf", "pdfa2b-o-300", targetPath, undefined, mockExecFile);

    // Verify gs was called with PDF/A-2 option
    const gsCall = commands.find((c) => c.cmd === "gs");
    expect(gsCall).toBeDefined();
    expect(gsCall?.args).toContain("-dPDFA=2");

    // Verify pdftoppm was NOT called (source=o means from original)
    const pdftoppmCall = commands.find((c) => c.cmd === "pdftoppm");
    expect(pdftoppmCall).toBeUndefined();
  });

  test("should process pdf-300-s chip correctly (with signing)", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftoppm") {
        const outputPrefix = args[args.length - 1];
        const outputDir = join(outputPrefix, "..");
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        writeFileSync(`${outputPrefix}-01.png`, "fake png");
        callback(null, "", "");
      } else if (cmd === "img2pdf") {
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1) {
          const outputPdf = args[outputIndex + 1];
          const outputDir = join(outputPdf, "..");
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPdf, "fake pdf");
        }
        callback(null, "", "");
      } else if (cmd === "python3") {
        // Mock Python signing script - creates signed.pdf
        const inputPdf = args[1];
        const outputPdf = args[2];
        const outputDir = join(outputPdf, "..");
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        // Copy input to output with "signed" marker
        if (existsSync(inputPdf)) {
          writeFileSync(outputPdf, "signed pdf content");
        }
        callback(null, "", "");
      } else {
        callback(null, "", "");
      }
    };

    const inputPdf = join(testDir, "input.pdf");
    writeFileSync(inputPdf, "fake pdf content");

    const targetPath = join(testDir, "output");
    await convert(inputPdf, "pdf", "pdf-300-s", targetPath, undefined, mockExecFile);

    // Verify output file exists (outDir is dirname(targetPath) = testDir)
    const expectedOutput = join(testDir, "pack_pdf-300-s.pdf");
    expect(existsSync(expectedOutput)).toBe(true);

    // Verify file content contains signed marker
    const content = readFileSync(expectedOutput, "utf-8");
    expect(content).toContain("signed");
  });

  test("should throw error for invalid chip", async () => {
    const mockExecFile: ExecFileFn = (
      _cmd: string,
      _args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      callback(null, "", "");
    };

    const inputPdf = join(testDir, "input.pdf");
    writeFileSync(inputPdf, "fake pdf content");

    const targetPath = join(testDir, "output");

    await expect(
      convert(inputPdf, "pdf", "invalid-chip", targetPath, undefined, mockExecFile),
    ).rejects.toThrow("INVALID_CHIP");
  });
});

// =============================================================================
// Chip 完整性測試
// =============================================================================

describe("ALL_CHIPS completeness", () => {
  test("all chips should be parseable", () => {
    for (const chip of ALL_CHIPS) {
      const parsed = parseChip(chip);
      expect(parsed).not.toBeNull();
      expect(parsed?.rawChip).toBe(chip);
    }
  });

  test("should contain all expected image chips", () => {
    const imageChips = ALL_CHIPS.filter((c) => parseChip(c)?.kind === "images");
    expect(imageChips).toHaveLength(9); // 3 formats × 3 dpis
  });

  test("should contain all expected pdf_image chips", () => {
    const pdfChips = ALL_CHIPS.filter((c) => parseChip(c)?.kind === "pdf_image");
    expect(pdfChips).toHaveLength(18); // 3 dpis × 6 variants
  });

  test("should contain all expected pdfa chips", () => {
    const pdfaChips = ALL_CHIPS.filter((c) => parseChip(c)?.kind === "pdfa");
    expect(pdfaChips).toHaveLength(72); // 2 levels × 2 sources × 3 dpis × 6 variants
  });

  test("should contain all expected all chips", () => {
    const allChips = ALL_CHIPS.filter((c) => parseChip(c)?.kind === "all");
    expect(allChips).toHaveLength(3); // 3 dpis
  });
});
