import { test } from "bun:test";
import { convert } from "../../src/converters/graphicsmagick.ts";
import { runCommonTests } from "./helpers/commonTests.ts";

runCommonTests(convert);

test.skip("dummy - required to trigger test detection", () => {});
