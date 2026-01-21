import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { convert, properties } from "../../src/converters/mineru";
import type { ExecFileException } from "node:child_process";
import { ExecFileFn } from "../../src/converters/types";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

// Skip common tests as MinerU has different behavior (archive output)
test.skip("dummy - required to trigger test detection", () => {});

describe("MinerU converter properties", () => {
  test("should have correct input formats", () => {
    expect(properties.from.document).toContain("pdf");
    expect(properties.from.document).toContain("ppt");
    expect(properties.from.document).toContain("pptx");
    expect(properties.from.document).toContain("xls");
    expect(properties.from.document).toContain("xlsx");
    expect(properties.from.document).toContain("doc");
    expect(properties.from.document).toContain("docx");
  });

  test("should have correct output formats", () => {
    expect(properties.to.document).toContain("md-t");
    expect(properties.to.document).toContain("md-i");
  });

  test("should have archive output mode", () => {
    expect(properties.outputMode).toBe("archive");
  });
});

describe("MinerU converter md-t mode", () => {
  const testDir = "./test-output-mineru-t";
  
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

  test("should call magic-pdf with markdown table mode for md-t", async () => {
    let magicPdfArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "magic-pdf") {
        magicPdfArgs = args;
        // Simulate MinerU creating output
        const outputDir = args[3]; // -o argument
        if (outputDir && !existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        const autoDir = join(outputDir, "auto");
        if (!existsSync(autoDir)) {
          mkdirSync(autoDir, { recursive: true });
        }
        writeFileSync(join(autoDir, "output.md"), "# Test\n\n| Col1 | Col2 |\n|---|---|\n| A | B |");
        callback(null, "MinerU conversion complete", "");
      } else if (cmd === "zip") {
        // Simulate zip creation
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.zip");
    await convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile);

    expect(magicPdfArgs).toContain("--table-mode");
    expect(magicPdfArgs).toContain("markdown");
  });
});

describe("MinerU converter md-i mode", () => {
  const testDir = "./test-output-mineru-i";
  
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

  test("should call magic-pdf with image table mode for md-i", async () => {
    let capturedArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "magic-pdf") {
        capturedArgs = args;
        // Simulate MinerU creating output
        const outputDir = args[3]; // -o argument
        if (outputDir && !existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        const autoDir = join(outputDir, "auto");
        if (!existsSync(autoDir)) {
          mkdirSync(autoDir, { recursive: true });
        }
        writeFileSync(join(autoDir, "output.md"), "# Test\n\n![Table](images/table_1.png)");
        callback(null, "MinerU conversion complete", "");
      } else if (cmd === "zip") {
        // Simulate zip creation
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.zip");
    await convert("test.pdf", "pdf", "md-i", targetPath, undefined, mockExecFile);

    expect(capturedArgs).toContain("--table-mode");
    expect(capturedArgs).toContain("image");
  });
});

describe("MinerU converter ZIP output", () => {
  const testDir = "./test-output-mineru-zip";
  
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

  test("should create ZIP archive from output", async () => {
    let zipCalled = false;
    let zipArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "magic-pdf") {
        // Simulate MinerU creating output
        const outputDir = args[3]; // -o argument
        if (outputDir && !existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        const autoDir = join(outputDir, "auto");
        if (!existsSync(autoDir)) {
          mkdirSync(autoDir, { recursive: true });
        }
        writeFileSync(join(autoDir, "output.md"), "# Test content");
        mkdirSync(join(autoDir, "images"), { recursive: true });
        writeFileSync(join(autoDir, "images", "img1.png"), "fake image data");
        callback(null, "MinerU conversion complete", "");
      } else if (cmd === "zip") {
        zipCalled = true;
        zipArgs = args;
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.zip");
    const result = await convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile);

    expect(result).toBe("Done");
    expect(zipCalled).toBe(true);
    expect(zipArgs).toContain("-r");
  });

  test("should reject on magic-pdf error", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "magic-pdf") {
        callback(new Error("MinerU failed") as ExecFileException, "", "Error processing file");
      }
    };

    const targetPath = join(testDir, "output.zip");
    expect(convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile))
      .rejects.toMatch(/mineru error/);
  });
});
