import { expect, test, describe } from "bun:test";
import { convert } from "../../src/converters/pandoc";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

describe("convert", () => {
  test("should call pandoc with correct arguments (normal)", async () => {
    const { execFile, calls } = createMockExecFile();

    const result = await convert(
      "input.md",
      "markdown",
      "html",
      "output.html",
      undefined,
      execFile,
    );

    expect(calls).toEqual([
      {
        cmd: "pandoc",
        args: ["input.md", "-f", "markdown", "-t", "html", "-o", "output.html"],
      },
    ]);
    expect(result).toBe("Done");
  });

  test.each(["pdf", "latex"])("should use the xelatex pdf engine for %s", async (convertTo) => {
    const { execFile, calls } = createMockExecFile();

    await convert("input.md", "markdown", convertTo, `output.${convertTo}`, undefined, execFile);

    expect(calls[0]?.args).toEqual([
      "--pdf-engine=xelatex",
      "input.md",
      "-f",
      "markdown",
      "-t",
      convertTo,
      "-o",
      `output.${convertTo}`,
    ]);
  });

  test("should not set a pdf engine for other targets", async () => {
    const { execFile, calls } = createMockExecFile();

    await convert("input.md", "markdown", "docx", "output.docx", undefined, execFile);

    expect(calls[0]?.args.some((arg) => arg.startsWith("--pdf-engine"))).toBe(false);
  });
});
