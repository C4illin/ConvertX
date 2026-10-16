import { test } from "bun:test";
import { convert } from "../../../src/converters/ffmpeg";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected JPEG bytes", () =>
  runGoldenConversion("ffmpeg", convert, "jpg"));
