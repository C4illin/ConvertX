import { test } from "bun:test";
import { convert } from "../../src/converters/resvg";
import { runCommonTests } from "./helpers/commonTests";

runCommonTests(convert);

test.skip("dummy - required to trigger test detection", () => {});
