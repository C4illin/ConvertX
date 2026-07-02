import { beforeEach, expect, test, describe, afterEach } from "bun:test";
import { convert } from "../../src/converters/pandoc";
import type { ExecFileFn } from "../../src/converters/types";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("convert", () => {
  let mockExecFile: ExecFileFn;
  let tempFiles: string[] = [];

  afterEach(() => {
    for (const f of tempFiles) {
      try {
        unlinkSync(f);
      } catch {
        /* ignore */
      }
    }
    tempFiles = [];
  });

  function makeTempFile(content: string, ext = "md"): string {
    const p = join(
      tmpdir(),
      `pandoc-test-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
    );
    writeFileSync(p, content, "utf-8");
    tempFiles.push(p);
    return p;
  }

  function assertCJKFontArg(args: string[], expectedFont: string) {
    const idx = args.indexOf(`CJKmainfont=${expectedFont}`);
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx - 1]).toBe("-V");
  }

  beforeEach(() => {
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "");
  });

  test("should call pandoc with correct arguments", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const result = await convert(
      "input.md",
      "markdown",
      "html",
      "output.html",
      undefined,
      mockExecFile,
    );
    expect(calledArgs[0]).toBe("pandoc");
    expect(calledArgs[1]).toEqual([
      "input.md",
      "-f",
      "markdown",
      "-t",
      "html",
      "-o",
      "output.html",
    ]);
    expect(result).toBe("Done");
  });

  test("should add xelatex argument for pdf", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# Hello World\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    expect(calledArgs[1][0]).toBe("--pdf-engine=xelatex");
    expect(calledArgs[1]).toContain(filePath);
  });

  test("should not add CJK mainfont for non-CJK content", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# Hello World\nThis is English text.\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    expect(calledArgs[1].some((arg) => arg.startsWith("CJKmainfont"))).toBe(false);
  });

  test("should add CJKmainfont=SC for Chinese content with -V adjacency", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# 中文标题\n这是一段中文内容。\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    assertCJKFontArg(calledArgs[1], "Noto Sans CJK SC");
  });

  test("should add CJKmainfont=JP for Japanese content with -V adjacency", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# 日本語タイトル\nこれは日本語の内容です。\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    assertCJKFontArg(calledArgs[1], "Noto Sans CJK JP");
  });

  test("should add CJKmainfont=KR for Korean content with -V adjacency", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# 한국어 제목\n이것은 한국어 내용입니다.\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    assertCJKFontArg(calledArgs[1], "Noto Sans CJK KR");
  });

  test("should prefer Japanese font when both Kanji and Kana present", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# 日本語のテスト\nこれは漢字とひらがなの文章です。\n");
    await convert(filePath, "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    assertCJKFontArg(calledArgs[1], "Noto Sans CJK JP");
    expect(calledArgs[1].some((arg) => arg === "CJKmainfont=Noto Sans CJK SC")).toBe(false);
  });

  test("should not add CJK mainfont for latex when content is non-CJK", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# English Title\nSome text.\n");
    await convert(filePath, "markdown", "latex", "output.tex", undefined, mockExecFile);
    expect(calledArgs[1][0]).toBe("--pdf-engine=xelatex");
    expect(calledArgs[1].some((arg) => arg.startsWith("CJKmainfont"))).toBe(false);
  });

  test("should not add CJK mainfont for non-pdf/latex output", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    const filePath = makeTempFile("# 中文标题\n");
    await convert(filePath, "markdown", "html", "output.html", undefined, mockExecFile);
    expect(calledArgs[1].some((arg) => arg.startsWith("CJKmainfont"))).toBe(false);
  });

  test("should handle unreadable file gracefully without CJK font", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };
    await convert("/nonexistent/file.md", "markdown", "pdf", "output.pdf", undefined, mockExecFile);
    expect(calledArgs[1][0]).toBe("--pdf-engine=xelatex");
    expect(calledArgs[1].some((arg) => arg.startsWith("CJKmainfont"))).toBe(false);
  });

  test.each(["docx", "epub", "odt"])(
    "should always add CJK font for %s binary format with -V adjacency",
    async (format: string) => {
      let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
      mockExecFile = (cmd, args, callback) => {
        calledArgs = [cmd, args, callback];
        callback(null, "output-data", "");
      };
      const filePath = makeTempFile("binary placeholder content", format);
      await convert(filePath, format, "pdf", "output.pdf", undefined, mockExecFile);
      assertCJKFontArg(calledArgs[1], "Noto Sans CJK SC");
    },
  );

  test("should reject if execFile returns an error", async () => {
    const filePath = makeTempFile("# Test\n");
    mockExecFile = (cmd, args, callback) => callback(new Error("fail"), "", "");
    await expect(
      convert(filePath, "markdown", "html", "output.html", undefined, mockExecFile),
    ).rejects.toMatch(/error: Error: fail/);
  });
});
