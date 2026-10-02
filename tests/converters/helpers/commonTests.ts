import { test } from "bun:test";
import { ConvertFnWithExecFile } from "../../../src/converters/types";
import {
  runConvertFailTest,
  runConvertLogsNothingWithoutOutput,
  runConvertLogsStderror,
  runConvertLogsStderrorAndStdout,
  runConvertSuccessTest,
} from "./converters";

export function runCommonTests(convert: ConvertFnWithExecFile) {
  test("convert resolves when execFile succeeds", async () => {
    await runConvertSuccessTest(convert);
  });

  test("convert rejects when execFile fails", async () => {
    await runConvertFailTest(convert);
  });

  test("convert logs stderr when present", async () => {
    await runConvertLogsStderror(convert);
  });

  test("convert logs both stderr and stdout when present", async () => {
    await runConvertLogsStderrorAndStdout(convert);
  });

  test("convert logs nothing when stdout and stderr are empty", async () => {
    await runConvertLogsNothingWithoutOutput(convert);
  });
}
