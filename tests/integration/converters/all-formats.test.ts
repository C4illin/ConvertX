import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { convert as ffmpeg } from "../../../src/converters/ffmpeg";
import { convert as graphicsmagick } from "../../../src/converters/graphicsmagick";
import { convert as imagemagick } from "../../../src/converters/imagemagick";
import { convert as inkscape } from "../../../src/converters/inkscape";
import { convert as libjxl } from "../../../src/converters/libjxl";
import { getPossibleTargets } from "../../../src/converters/main";
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
  vips,
  vtracer,
};

test("converts every saved PNG target for each converter", async () => {
  const possibleTargets = getPossibleTargets("png");
  const inputFileName = "sample.png";
  const inputStem = path.parse(inputFileName).name;
  const inputPath = path.resolve(`tests/integration/converters/inputs/${inputFileName}`);
  const expectedFailuresByInput = (await Bun.file(
    "tests/integration/converters/expected-failures.json",
  ).json()) as Record<string, string[]>;
  expect(Object.keys(expectedFailuresByInput)).toContain(inputFileName);
  const expectedFailures = expectedFailuresByInput[inputFileName] ?? [];
  const expectedFailureSet = new Set(expectedFailures);
  const failures: string[] = [];
  const observedFailures: string[] = [];
  let testedTargets = 0;
  let successfulTargets = 0;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  console.log = () => {};
  console.error = () => {};

  try {
    for (const [converterName, convert] of Object.entries(converters)) {
      const outputDirectory = path.resolve(`tests/integration/converters/outputs/${converterName}`);
      const declaredTargets = [...new Set(possibleTargets[converterName] ?? [])];

      for (const target of declaredTargets) {
        const targetKey = `${converterName}:${target}`;
        const outputFile = `${inputStem}.${target}`;
        testedTargets++;

        const temporaryDirectory = await mkdtemp(path.join(tmpdir(), `convertx-${converterName}-`));
        const actualPath = path.join(temporaryDirectory, outputFile);
        const expectedPath = path.join(outputDirectory, outputFile);

        try {
          await convert(inputPath, "png", target, actualPath);
          const actualSize = (await Bun.file(actualPath).stat())?.size ?? 0;
          if (expectedFailureSet.has(targetKey)) {
            if (actualSize > 0) {
              failures.push(`${targetKey}: expected failure became successful`);
            } else {
              observedFailures.push(targetKey);
            }
          } else {
            expect(actualSize).toBeGreaterThan(0);
            expect((await Bun.file(expectedPath).stat())?.size).toBeGreaterThan(0);
            successfulTargets++;
          }
        } catch (error) {
          if (expectedFailureSet.has(targetKey)) {
            observedFailures.push(targetKey);
          } else {
            failures.push(`${targetKey}: ${String(error)}`);
          }
        } finally {
          await rm(temporaryDirectory, { recursive: true, force: true });
        }
      }
    }
  } finally {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }

  expect(testedTargets).toBe(405);
  expect(successfulTargets).toBe(370);
  expect(observedFailures.sort()).toEqual(expectedFailures);
  expect(failures).toEqual([]);
}, 120000);
