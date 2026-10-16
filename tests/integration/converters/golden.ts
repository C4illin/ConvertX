import { expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

type Converter = (
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
) => Promise<string>;

export async function runGoldenConversion(
  converterName: string,
  convert: Converter,
  outputExtension: string,
) {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), `convertx-${converterName}-`));
  const outputPath = path.join(outputDirectory, `sample.${outputExtension}`);
  const inputPath = path.resolve("tests/integration/converters/inputs/sample.png");
  const expectedPath = path.resolve(
    `tests/integration/converters/outputs/${converterName}/sample.${outputExtension}`,
  );

  try {
    await convert(inputPath, "png", outputExtension, outputPath);
    expect(await Bun.file(outputPath).bytes()).toEqual(await Bun.file(expectedPath).bytes());
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}
