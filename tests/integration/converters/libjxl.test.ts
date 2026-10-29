import { test } from "bun:test";

import { convert } from "../../../src/converters/libjxl";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected JPEG XL bytes", () =>
  runGoldenConversion("libjxl", convert, "sample.png", "jxl"));
