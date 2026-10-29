import { test } from "bun:test";

import { convert } from "../../../src/converters/vtracer";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected SVG bytes", () =>
  runGoldenConversion("vtracer", convert, "sample.png", "svg"));
