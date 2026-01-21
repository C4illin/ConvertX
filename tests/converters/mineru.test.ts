import { test, expect, describe, beforeEach, afterEach } from "bun:test";
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

  test("should call mineru with markdown table mode for md-t", async () => {
    let mineruArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "mineru") {
        mineruArgs = args;
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
      } else if (cmd === "tar") {
        // Simulate tar.gz creation
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar.gz");
    await convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile);

    expect(mineruArgs).toContain("--table-mode");
    expect(mineruArgs).toContain("markdown");
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

  test("should call mineru with image table mode for md-i", async () => {
    let capturedArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "mineru") {
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
      } else if (cmd === "tar") {
        // Simulate tar.gz creation
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar.gz");
    await convert("test.pdf", "pdf", "md-i", targetPath, undefined, mockExecFile);

    expect(capturedArgs).toContain("--table-mode");
    expect(capturedArgs).toContain("image");
  });
});

describe("MinerU converter tar.gz output", () => {
  const testDir = "./test-output-mineru-targz";
  
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

  test("should create tar.gz archive from output", async () => {
    let tarCalled = false;
    let tarArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "mineru") {
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
      } else if (cmd === "tar") {
        tarCalled = true;
        tarArgs = args;
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "output.tar.gz");
    const result = await convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile);

    expect(result).toBe("Done");
    expect(tarCalled).toBe(true);
    expect(tarArgs).toContain("-czf");
  });

  test("should reject on mineru error", async () => {
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "mineru") {
        callback(new Error("MinerU failed") as ExecFileException, "", "Error processing file");
      }
    };

    const targetPath = join(testDir, "output.tar.gz");
    expect(convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile))
      .rejects.toMatch(/mineru error/);
  });

  test("should use correct tar arguments for compression", async () => {
    let tarArgs: string[] = [];
    
    const mockExecFile: ExecFileFn = (
      cmd: string,
      args: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
      options?: any,
    ) => {
      if (cmd === "mineru") {
        const outputDir = args[3];
        if (outputDir && !existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        const autoDir = join(outputDir, "auto");
        if (!existsSync(autoDir)) {
          mkdirSync(autoDir, { recursive: true });
        }
        writeFileSync(join(autoDir, "output.md"), "# Test");
        callback(null, "Done", "");
      } else if (cmd === "tar") {
        tarArgs = args;
        callback(null, "Archive created", "");
      }
    };

    const targetPath = join(testDir, "test_MINERU_md-t.tar.gz");
    await convert("test.pdf", "pdf", "md-t", targetPath, undefined, mockExecFile);

    // Verify tar is called with correct compression flags
    expect(tarArgs[0]).toBe("-czf");
    expect(tarArgs[1]).toContain(".tar.gz");
    expect(tarArgs[2]).toBe("-C");
    expect(tarArgs[4]).toBe(".");
  });
});
