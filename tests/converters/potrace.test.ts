import { test } from "bun:test";
import { convert } from "../../src/converters/potrace.ts";
import {
  runConvertFailTest,
  runConvertLogsStderror,
  runConvertLogsStderrorAndStdout,
  runConvertSuccessTest,
} from "./helpers/converters.ts";

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
