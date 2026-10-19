import { expect, test } from "bun:test";
import { convert } from "../../src/converters/dvisvgm";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test.each([
  { fileType: "dvi", convertTo: "svg", flags: [] },
  { fileType: "xdv", convertTo: "svg", flags: [] },
  { fileType: "eps", convertTo: "svg", flags: ["--eps"] },
  { fileType: "pdf", convertTo: "svg", flags: ["--pdf"] },
  { fileType: "dvi", convertTo: "svgz", flags: ["-z"] },
  { fileType: "eps", convertTo: "svgz", flags: ["--eps", "-z"] },
  { fileType: "pdf", convertTo: "svgz", flags: ["--pdf", "-z"] },
])("converts $fileType to $convertTo", async ({ fileType, convertTo, flags }) => {
  const { execFile, calls } = createMockExecFile();

  const result = await convert(
    `in/figure.${fileType}`,
    fileType,
    convertTo,
    `out/figure.${convertTo}`,
    undefined,
    execFile,
  );

  expect(result).toBe("Done");
  expect(calls).toEqual([
    {
      cmd: "dvisvgm",
      args: [...flags, `in/figure.${fileType}`, "-o", `out/figure.${convertTo}`],
    },
  ]);
});
