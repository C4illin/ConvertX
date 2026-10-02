import { expect, test } from "bun:test";
import { convert } from "../../src/converters/potrace";
import { runCommonTests } from "./helpers/commonTests";
import { createMockExecFile } from "./helpers/converters";

runCommonTests(convert);

test.each(["svg", "pdf", "eps", "dxf"])("selects the %s backend via -b", async (convertTo) => {
  const { execFile, calls } = createMockExecFile();

  await convert("in/bitmap.pbm", "pbm", convertTo, `out/bitmap.${convertTo}`, undefined, execFile);

  expect(calls).toEqual([
    {
      cmd: "potrace",
      args: ["in/bitmap.pbm", "-o", `out/bitmap.${convertTo}`, "-b", convertTo],
    },
  ]);
});
