import { test } from "bun:test";

import { convert } from "../../../src/converters/graphicsmagick";
import { runGoldenConversion } from "./golden";

test("converts the sample PNG to the expected JPEG bytes", () =>
  runGoldenConversion("graphicsmagick", convert, "sample.png", "jpeg"));
