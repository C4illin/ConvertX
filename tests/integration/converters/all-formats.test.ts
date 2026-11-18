import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { convert as ffmpeg } from "../../../src/converters/ffmpeg";
import { convert as graphicsmagick } from "../../../src/converters/graphicsmagick";
import { convert as imagemagick } from "../../../src/converters/imagemagick";
import { convert as inkscape } from "../../../src/converters/inkscape";
import { convert as libjxl } from "../../../src/converters/libjxl";
import { getPossibleTargets } from "../../../src/converters/main";
import { convert as resvg } from "../../../src/converters/resvg";
import { convert as vips } from "../../../src/converters/vips";
import { convert as vtracer } from "../../../src/converters/vtracer";

type Converter = (
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
) => Promise<string>;

const converters: Record<string, Converter> = {
  ffmpeg,
  graphicsmagick,
  imagemagick,
  inkscape,
  libjxl,
  resvg,
  vips,
  vtracer,
};

const testsDirectory = path.resolve("tests/integration/converters");
const inputFileNames = (await readdir(path.join(testsDirectory, "inputs")))
  .filter((fileName) => !fileName.startsWith("."))
  .sort();

// one test per input file x converter, skipping converters with no targets for the input
const cases: [inputFileName: string, converterName: string][] = [];
for (const inputFileName of inputFileNames) {
  const inputFileType = path.parse(inputFileName).ext.slice(1);
  const possibleTargets = getPossibleTargets(inputFileType);
  for (const converterName of Object.keys(converters)) {
    if ((possibleTargets[converterName] ?? []).length > 0) {
      cases.push([inputFileName, converterName]);
    }
  }
}

test.each(cases)(
  "converts all targets from %s with %s",
  async (inputFileName, converterName) => {
    const inputFileType = path.parse(inputFileName).ext.slice(1);
    const inputPath = path.join(testsDirectory, "inputs", inputFileName);
    const convert = converters[converterName];
    const declaredTargets = [...new Set(getPossibleTargets(inputFileType)[converterName] ?? [])];
    const failures: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = () => {};
    console.error = () => {};

    try {
      for (const target of declaredTargets) {
        const temporaryDirectory = await mkdtemp(path.join(tmpdir(), `convertx-${converterName}-`));
        const actualPath = path.join(temporaryDirectory, `output.${target}`);

        try {
          await convert(inputPath, inputFileType, target, actualPath);
          const stat = await Bun.file(actualPath).stat();
          if (stat.size === 0) {
            failures.push(target);
          }
        } catch {
          failures.push(target);
        } finally {
          await rm(temporaryDirectory, { recursive: true, force: true });
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
