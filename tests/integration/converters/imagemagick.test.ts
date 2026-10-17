import { test } from "bun:test";
import { convert } from "../../../src/converters/imagemagick";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected JPEG bytes", () =>
  runGoldenConversion("imagemagick", convert, "sample.png", "jpg"));
