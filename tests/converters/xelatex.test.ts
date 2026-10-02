import { expect, test } from "bun:test";
import { convert } from "../../src/converters/xelatex";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test("invokes latexmk with xelatex in non-interactive mode", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/paper.tex", "latex", "pdf", "out/job/paper.pdf", undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "latexmk",
      args: ["-xelatex", "-interaction=nonstopmode", "-output-directory=out/job", "in/paper.tex"],
    },
  ]);
});

test("strips a leading './' from the output directory", async () => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/paper.tex", "latex", "pdf", "./data/output/paper.pdf", undefined, execFile);

  expect(calls[0]?.args).toContain("-output-directory=data/output");
});
