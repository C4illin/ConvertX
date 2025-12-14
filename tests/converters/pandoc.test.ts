import { beforeEach, expect, test, describe } from "bun:test";
import { convert } from "../../src/converters/pandoc";
import type { ExecFileFn } from "../../src/converters/types";

describe("convert", () => {
  let mockExecFile: ExecFileFn;

  beforeEach(() => {
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "");
  });

  test("should call pandoc with correct arguments (normal)", async () => {
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

  test("should add xelatex argument for pdf/latex", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };

    await convert("input.md", "markdown", "pdf", "output.pdf", undefined, mockExecFile);

    expect(calledArgs[1][0]).toBe("--pdf-engine=xelatex");
    expect(calledArgs[1]).toContain("input.md");
    expect(calledArgs[1]).toContain("-f");
    expect(calledArgs[1]).toContain("markdown");
    expect(calledArgs[1]).toContain("-t");
    expect(calledArgs[1]).toContain("pdf");
    expect(calledArgs[1]).toContain("-o");
    expect(calledArgs[1]).toContain("output.pdf");
  });

  test("should reject if execFile returns an error", async () => {
    mockExecFile = (cmd, args, callback) => callback(new Error("fail"), "", "");
    await expect(
      convert("input.md", "markdown", "html", "output.html", undefined, mockExecFile),
    ).rejects.toMatch(/error: Error: fail/);
  });
});
