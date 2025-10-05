import { test } from "bun:test";
import { convert } from "../../src/converters/xelatex";
import { runCommonTests } from "./helpers/commonTests";

runCommonTests(convert);

test.skip("dummy - required to trigger test detection", () => {});
