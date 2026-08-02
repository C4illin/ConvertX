import { test } from "bun:test";
import { convert } from "../../src/converters/libheif";
import { runCommonTests } from "./helpers/commonTests.test";

runCommonTests(convert);

test.skip("dummy - required to trigger test detection", () => {});
