import { test } from "bun:test";
import { convert } from "../../../src/converters/vips";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected JPEG bytes", () =>
  runGoldenConversion("vips", convert, "sample.png", "jpeg"));
