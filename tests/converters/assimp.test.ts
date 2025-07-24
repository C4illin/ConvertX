import { test } from "bun:test";
import { convert } from "../../src/converters/assimp.ts";
import {
  runConvertFailTest,
  runConvertLogsStderror,
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
