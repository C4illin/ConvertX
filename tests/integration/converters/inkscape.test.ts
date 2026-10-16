import { test } from "bun:test";
import { convert } from "../../../src/converters/inkscape";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected SVG bytes", () =>
  runGoldenConversion("inkscape", convert, "sample.png", "svg"));
