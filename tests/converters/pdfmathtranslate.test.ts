import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { convert, properties } from "../../src/converters/pdfmathtranslate";
import type { ExecFileException } from "node:child_process";
import { ExecFileFn } from "../../src/converters/types";
import { mkdirSync, existsSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Skip common tests as PDFMathTranslate has different behavior (archive output)
test.skip("dummy - required to trigger test detection", () => {});

describe("PDFMathTranslate converter properties", () => {
  test("should have correct input formats", () => {
    expect(properties.from.document).toContain("pdf");
  });

  test("should have correct output formats for multiple languages", () => {
    expect(properties.to.document).toContain("pdf-en");
    expect(properties.to.document).toContain("pdf-zh");
    expect(properties.to.document).toContain("pdf-zh-TW");
    expect(properties.to.document).toContain("pdf-ja");
    expect(properties.to.document).toContain("pdf-ko");
    expect(properties.to.document).toContain("pdf-de");
    expect(properties.to.document).toContain("pdf-fr");
  });

  test("should have archive output mode", () => {
    expect(properties.outputMode).toBe("archive");
  });
});

describe("PDFMathTranslate converter - Chinese translation", () => {
  const testDir = "./test-output-pdfmathtranslate-zh";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    // Create a dummy PDF file for testing
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should call pdf2zh with correct language argument for zh", async () => {
    let pdf2zhArgs: string[] = [];
    let pdf2zhCalled = false;

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        pdf2zhCalled = true;
        pdf2zhArgs = args;

        // Simulate pdf2zh creating output files
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          // Create mock output files
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated content");
          writeFileSync(join(outputDir, "input-dual.pdf"), "%PDF-1.4\n%Dual content");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        // Simulate .tar creation (no compression)
        // Verify it's creating .tar not .tar.gz
        const tarArgs = args;
        expect(tarArgs[0]).toBe("-cf"); // -cf for tar (not -czf for gzip)
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-zh", targetPath, undefined, mockExecFile);

    expect(pdf2zhCalled).toBe(true);
    expect(pdf2zhArgs).toContain("-lo");
    expect(pdf2zhArgs).toContain("zh");
    expect(pdf2zhArgs).toContain("-o");
    expect(pdf2zhArgs).toContain("-s"); // Translation service
  });
});

describe("PDFMathTranslate converter - English translation", () => {
  const testDir = "./test-output-pdfmathtranslate-en";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should call pdf2zh with correct language argument for en", async () => {
    let pdf2zhArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        pdf2zhArgs = args;
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-en", targetPath, undefined, mockExecFile);

    expect(pdf2zhArgs).toContain("-lo");
    expect(pdf2zhArgs).toContain("en");
  });
});

describe("PDFMathTranslate converter - Japanese translation", () => {
  const testDir = "./test-output-pdfmathtranslate-ja";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should call pdf2zh with correct language argument for ja", async () => {
    let pdf2zhArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        pdf2zhArgs = args;
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-ja", targetPath, undefined, mockExecFile);

    expect(pdf2zhArgs).toContain("-lo");
    expect(pdf2zhArgs).toContain("ja");
  });
});

describe("PDFMathTranslate converter - Traditional Chinese", () => {
  const testDir = "./test-output-pdfmathtranslate-zhtw";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should call pdf2zh with correct language argument for zh-TW", async () => {
    let pdf2zhArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        pdf2zhArgs = args;
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-zh-TW", targetPath, undefined, mockExecFile);

    expect(pdf2zhArgs).toContain("-lo");
    expect(pdf2zhArgs).toContain("zh-TW");
  });
});

describe("PDFMathTranslate converter - Output structure", () => {
  const testDir = "./test-output-pdfmathtranslate-structure";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should create archive with translated-<lang>.pdf and bilingual-<lang>.pdf (no original)", async () => {
    let tarSourceDir = "";
    let archiveContents: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          // 模擬 pdf2zh 產生 mono（翻譯版）和 dual（對照版）
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated");
          writeFileSync(join(outputDir, "input-dual.pdf"), "%PDF-1.4\n%Bilingual");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        // Capture the source directory for the archive
        const cIndex = args.indexOf("-C");
        if (cIndex !== -1 && args[cIndex + 1]) {
          tarSourceDir = args[cIndex + 1];
          // Read the files in the archive source directory
          if (existsSync(tarSourceDir)) {
            archiveContents = readdirSync(tarSourceDir);
          }
        }
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-ko", targetPath, undefined, mockExecFile);

    // Verify archive contains expected files (翻譯版 + 對照版，不包含原始檔)
    expect(archiveContents).toContain("translated-ko.pdf");
    expect(archiveContents).toContain("bilingual-ko.pdf");
    // 不應包含原始檔案
    expect(archiveContents).not.toContain("original.pdf");
  });

  test("should only use .tar format, not .tar.gz", async () => {
    let tarArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        const outputDirIndex = args.indexOf("-o");
        if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
          const outputDir = args[outputDirIndex + 1];
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(join(outputDir, "input-mono.pdf"), "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        tarArgs = args;
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-de", targetPath, undefined, mockExecFile);

    // Verify tar is called with -cf (not -czf for gzip compression)
    expect(tarArgs[0]).toBe("-cf");
    expect(tarArgs[0]).not.toBe("-czf");

    // Verify output path ends with .tar not .tar.gz
    const outputTar = tarArgs[1];
    expect(outputTar).toMatch(/\.tar$/);
    expect(outputTar).not.toMatch(/\.tar\.gz$/);
    expect(outputTar).not.toMatch(/\.tgz$/);
  });
});

describe("PDFMathTranslate converter - Error handling", () => {
  const testDir = "./test-output-pdfmathtranslate-error";
  const testInputFile = join(testDir, "input.pdf");

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testInputFile, "%PDF-1.4\n%Test PDF content");
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("should reject with error when pdf2zh fails", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      _args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        const error = new Error("Translation failed") as ExecFileException;
        callback(error, "", "Error: Translation service unavailable");
      }
    };

    const targetPath = join(testDir, "output.tar");

    await expect(
      convert(testInputFile, "pdf", "pdf-zh", targetPath, undefined, mockExecFile),
    ).rejects.toThrow(/pdf2zh error|PDFMathTranslate error/);
  });

  test("should reject when no output PDF is generated", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      _args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdf2zh") {
        // Don't create any output files
        callback(null, "Complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");

    await expect(
      convert(testInputFile, "pdf", "pdf-zh", targetPath, undefined, mockExecFile),
    ).rejects.toThrow(/No.*PDF.*found|No translated PDF/);
  });
});
