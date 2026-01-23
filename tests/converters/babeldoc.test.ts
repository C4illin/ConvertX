import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { convert, properties } from "../../src/converters/babeldoc";
import type { ExecFileException } from "node:child_process";
import { ExecFileFn } from "../../src/converters/types";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";

// Skip common tests as BabelDOC has different behavior (archive output)
test.skip("dummy - required to trigger test detection", () => {});

describe("BabelDOC converter properties", () => {
  test("should have correct input formats", () => {
    expect(properties.from.document).toContain("pdf");
  });

  test("should have correct output formats for PDF with multiple languages", () => {
    expect(properties.to.document).toContain("pdf-en");
    expect(properties.to.document).toContain("pdf-zh");
    expect(properties.to.document).toContain("pdf-zh-TW");
    expect(properties.to.document).toContain("pdf-ja");
    expect(properties.to.document).toContain("pdf-ko");
    expect(properties.to.document).toContain("pdf-de");
    expect(properties.to.document).toContain("pdf-fr");
  });

  test("should have correct output formats for Markdown with multiple languages", () => {
    expect(properties.to.document).toContain("md-en");
    expect(properties.to.document).toContain("md-zh");
    expect(properties.to.document).toContain("md-ja");
  });

  test("should have correct output formats for HTML with multiple languages", () => {
    expect(properties.to.document).toContain("html-en");
    expect(properties.to.document).toContain("html-zh");
    expect(properties.to.document).toContain("html-ja");
  });

  test("should have archive output mode", () => {
    expect(properties.outputMode).toBe("archive");
  });
});

describe("BabelDOC converter - Chinese translation", () => {
  const testDir = "./test-output-babeldoc-zh";
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

  test("should call babeldoc with correct language argument for zh", async () => {
    let babeldocArgs: string[] = [];
    let babeldocCalled = false;

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        // 返回超過 100 個字元，表示 PDF 不需要 OCR
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        babeldocCalled = true;
        babeldocArgs = args;

        // Simulate babeldoc creating output file
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          // Create parent directory if needed
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "%PDF-1.4\n%Translated content");
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

    expect(babeldocCalled).toBe(true);
    expect(babeldocArgs).toContain("-i");
    expect(babeldocArgs).toContain("-o");
    expect(babeldocArgs).toContain("-l");
    expect(babeldocArgs).toContain("zh-Hans"); // BabelDOC uses zh-Hans for simplified Chinese
    expect(babeldocArgs).toContain("--output-format");
    expect(babeldocArgs).toContain("pdf");
    expect(babeldocArgs).toContain("--service");
  });
});

describe("BabelDOC converter - English translation", () => {
  const testDir = "./test-output-babeldoc-en";
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

  test("should call babeldoc with correct language argument for en", async () => {
    let babeldocArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        babeldocArgs = args;
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-en", targetPath, undefined, mockExecFile);

    expect(babeldocArgs).toContain("-l");
    expect(babeldocArgs).toContain("en");
  });
});

describe("BabelDOC converter - Traditional Chinese", () => {
  const testDir = "./test-output-babeldoc-zhtw";
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

  test("should call babeldoc with correct language argument for zh-TW", async () => {
    let babeldocArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        babeldocArgs = args;
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-zh-TW", targetPath, undefined, mockExecFile);

    expect(babeldocArgs).toContain("-l");
    expect(babeldocArgs).toContain("zh-Hant"); // BabelDOC uses zh-Hant for traditional Chinese
  });
});

describe("BabelDOC converter - Output structure", () => {
  const testDir = "./test-output-babeldoc-structure";
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

  test("should create archive with translated-<lang>.pdf", async () => {
    let tarSourceDir = "";

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "%PDF-1.4\n%Translated content");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        // Capture the source directory for the tar archive
        const cIndex = args.indexOf("-C");
        if (cIndex !== -1 && args[cIndex + 1]) {
          tarSourceDir = args[cIndex + 1];
        }
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-ko", targetPath, undefined, mockExecFile);

    // The archive source directory should end with "archive"
    expect(tarSourceDir).toContain("archive");
  });

  test("should only use .tar format, not .tar.gz", async () => {
    let tarCommand: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "%PDF-1.4\n%Translated");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        tarCommand = args;
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "pdf-de", targetPath, undefined, mockExecFile);

    // Should use -cf (no gzip) not -czf
    expect(tarCommand[0]).toBe("-cf");
    expect(tarCommand).not.toContain("-czf");
    expect(tarCommand).not.toContain("-z");
  });
});

describe("BabelDOC converter - Error handling", () => {
  const testDir = "./test-output-babeldoc-error";
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

  test("should reject with error when babeldoc fails", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      _args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        const error = new Error("Translation failed") as ExecFileException;
        error.code = 1;
        callback(error, "", "babeldoc: Translation error");
      }
    };

    const targetPath = join(testDir, "output.tar");

    await expect(
      convert(testInputFile, "pdf", "pdf-zh", targetPath, undefined, mockExecFile),
    ).rejects.toThrow();
  });

  test("should reject when no output PDF is generated", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      _args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        // Don't create output file, simulating failed translation
        callback(null, "Complete", "");
      }
    };

    const targetPath = join(testDir, "output.tar");

    await expect(
      convert(testInputFile, "pdf", "pdf-zh", targetPath, undefined, mockExecFile),
    ).rejects.toThrow();
  });
});

describe("BabelDOC converter - Markdown output format", () => {
  const testDir = "./test-output-babeldoc-md";
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

  test("should call babeldoc with md output format", async () => {
    let babeldocArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        babeldocArgs = args;
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "# Translated Markdown Content");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "md-zh", targetPath, undefined, mockExecFile);

    expect(babeldocArgs).toContain("-l");
    expect(babeldocArgs).toContain("zh-Hans");
    expect(babeldocArgs).toContain("--output-format");
    expect(babeldocArgs).toContain("md");
  });
});

describe("BabelDOC converter - HTML output format", () => {
  const testDir = "./test-output-babeldoc-html";
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

  test("should call babeldoc with html output format", async () => {
    let babeldocArgs: string[] = [];

    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      if (cmd === "pdftotext") {
        callback(
          null,
          "This is a comprehensive test PDF with more than enough text content to ensure that the OCR detection threshold of 100 characters is exceeded and the PDF is not treated as a scanned document requiring OCR processing.",
          "",
        );
      } else if (cmd === "babeldoc") {
        babeldocArgs = args;
        const outputIndex = args.indexOf("-o");
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          const outputPath = args[outputIndex + 1];
          const outputDir = dirname(outputPath);
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          writeFileSync(outputPath, "<html><body>Translated HTML</body></html>");
        }
        callback(null, "Translation complete", "");
      } else if (cmd === "tar") {
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar");
    await convert(testInputFile, "pdf", "html-ja", targetPath, undefined, mockExecFile);

    expect(babeldocArgs).toContain("-l");
    expect(babeldocArgs).toContain("ja");
    expect(babeldocArgs).toContain("--output-format");
    expect(babeldocArgs).toContain("html");
  });
});
