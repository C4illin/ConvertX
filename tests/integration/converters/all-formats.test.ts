import { expect, test } from "bun:test";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { getPossibleTargets, mainConverter, parseFileName } from "../../../src/converters/main";

const testsDirectory = path.resolve("tests/integration/converters");
const inputFileNames = (await readdir(path.join(testsDirectory, "inputs")))
  .filter((fileName) => !fileName.startsWith("."))
  .sort();

// one test per input file x registered converter, skipping converters with no targets for the input
const cases: [inputFileName: string, converterName: string][] = [];
for (const inputFileName of inputFileNames) {
  const { filetype: inputFileType } = parseFileName(inputFileName);
  const possibleTargets = getPossibleTargets(inputFileType);
  for (const converterName of Object.keys(possibleTargets)) {
    if ((possibleTargets[converterName] ?? []).length > 0) {
      cases.push([inputFileName, converterName]);
    }
  }
}

test.each(cases)(
  "converts all targets from %s with %s",
  async (inputFileName, converterName) => {
    const { filetype: inputFileType, stem: inputStem } = parseFileName(inputFileName);
    const inputPath = path.join(testsDirectory, "inputs", inputFileName);
    const declaredTargets = [...new Set(getPossibleTargets(inputFileType)[converterName] ?? [])];
    // outputs are kept in a gitignored folder for manual inspection
    const outputsDirectory = path.join(testsDirectory, "outputs", inputFileName, converterName);
    await rm(outputsDirectory, { recursive: true, force: true });
    await mkdir(outputsDirectory, { recursive: true });
    const failures: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = () => {};
    console.error = () => {};

    try {
      for (const target of declaredTargets) {
        const actualPath = path.join(outputsDirectory, `${inputStem}.${target}`);

        try {
          // mainConverter resolves with a status string instead of throwing on failure
          const result = await mainConverter(
            inputPath,
            inputFileType,
            target,
            actualPath,
            {},
            converterName,
          );
          if (result === "Failed, check logs" || result === "File type not supported") {
            failures.push(target);
            continue;
          }
          const stat = await Bun.file(actualPath).stat();
          if (stat.size === 0) {
            failures.push(target);
          }
        } catch {
          failures.push(target);
        }
      }
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }

    expect(failures.sort()).toMatchSnapshot();
  },
  120000,
);
