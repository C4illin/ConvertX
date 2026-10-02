// Loaded before every test file (see bunfig.toml).
import { afterAll, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testRoot = mkdtempSync(join(tmpdir(), "convertx-tests-"));

// Tests must never touch ./data/mydb.sqlite or a DB_PATH from the developer's shell.
process.env.DB_PATH = join(testRoot, "test.sqlite");
process.env.CONVERTX_TEST_ROOT = testRoot;

// Several pages import uploadsDir/outputDir from src/index.tsx. Importing the real module
// would start the server, spawn every converter's --version and schedule the job cleanup,
// and its relative ./data paths would mix test files with real conversions. Provide the
// constants directly, pointing at the temp directory.
mock.module("../src/index", () => ({
  uploadsDir: `${join(testRoot, "uploads")}/`,
  outputDir: `${join(testRoot, "output")}/`,
}));

// a preload's afterAll runs once after all test files (and once per file with --isolate)
afterAll(() => {
  rmSync(testRoot, { recursive: true, force: true });
});
