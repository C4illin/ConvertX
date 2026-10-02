import { expect, test } from "bun:test";
import { convert } from "../../src/converters/imagemagick";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

const ICO_ARGS = ["-define", "icon:auto-resize=256,128,64,48,32,16", "-background", "none"];

test.each([
  {
    name: "applies only EXIF auto-orient for a plain conversion",
    fileType: "jpg",
    convertTo: "png",
    inputArgs: [],
    outputArgs: ["-auto-orient"],
  },
  {
    name: "does not rasterize svg at high density unless the target is ico",
    fileType: "svg",
    convertTo: "png",
    inputArgs: [],
    outputArgs: ["-auto-orient"],
  },
  {
    name: "auto-resizes ico output with a transparent background",
    fileType: "eps",
    convertTo: "ico",
    inputArgs: [],
    outputArgs: [...ICO_ARGS, "-auto-orient"],
  },
  {
    name: "rasterizes svg at high density for ico output",
    fileType: "svg",
    convertTo: "ico",
    inputArgs: ["-background", "none", "-density", "512"],
    outputArgs: [...ICO_ARGS, "-auto-orient"],
  },
  {
    name: "rasterizes pdf input at 300 dpi",
    fileType: "pdf",
    convertTo: "png",
    inputArgs: ["-density", "300"],
    outputArgs: ["-auto-orient"],
  },
  {
    name: "combines pdf density with ico options",
    fileType: "pdf",
    convertTo: "ico",
    inputArgs: ["-density", "300"],
    outputArgs: [...ICO_ARGS, "-auto-orient"],
  },
  {
    name: "disables the emf delegate and flattens onto white",
    fileType: "emf",
    convertTo: "png",
    inputArgs: ["-define", "emf:delegate=false", "-density", "300"],
    outputArgs: ["-background", "white", "-alpha", "remove", "-auto-orient"],
  },
  {
    name: "combines emf handling with ico options",
    fileType: "emf",
    convertTo: "ico",
    inputArgs: ["-define", "emf:delegate=false", "-density", "300"],
    outputArgs: [...ICO_ARGS, "-background", "white", "-alpha", "remove", "-auto-orient"],
  },
])("$name ($fileType -> $convertTo)", async ({ fileType, convertTo, inputArgs, outputArgs }) => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert(
    `in/image.${fileType}`,
    fileType,
    convertTo,
    `out/image.${convertTo}`,
    undefined,
    execFile,
  );

  expect(result).toBe("Done");
  expect(calls).toEqual([
    {
      cmd: "magick",
      args: [...inputArgs, `in/image.${fileType}`, ...outputArgs, `out/image.${convertTo}`],
    },
  ]);
});
