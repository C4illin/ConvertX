import type { ExecFileException } from "node:child_process";
import { expect, test } from "bun:test";
import { convert, properties } from "../../src/converters/djvu";
import type { ExecFileFn } from "../../src/converters/types";
import { runCommonTests } from "./helpers/commonTests";

runCommonTests(convert);

test("advertises DjVu to PDF and TIFF conversions", () => {
  expect(properties).toEqual({
    from: { document: ["djvu", "djv"] },
    to: { document: ["pdf", "tiff"] },
  });
});

for (const format of ["pdf", "tiff"]) {
  test(`calls ddjvu with the ${format} output format`, async () => {
    let command = "";
    let args: string[] = [];
    const mockExecFile: ExecFileFn = (
      cmd: string,
      commandArgs: string[],
      callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
    ) => {
      command = cmd;
      args = commandArgs;
      callback(null, "", "");
    };

    await expect(
      convert("input.djvu", "djvu", format, `output.${format}`, undefined, mockExecFile),
    ).resolves.toBe("Done");
    expect(command).toBe("ddjvu");
    expect(args).toEqual([`-format=${format}`, "input.djvu", `output.${format}`]);
  });
}
