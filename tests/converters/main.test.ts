// Set isolated DB path before import to protect production data
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const testDbDir = join(tmpdir(), "converter-test-db");
rmSync(testDbDir, { recursive: true, force: true });
mkdirSync(testDbDir, { recursive: true });
process.env.DB_PATH = join(testDbDir, "test.sqlite");

import { test, expect, afterAll, afterEach } from "bun:test";
import type { Cookie } from "elysia";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { Database } from "bun:sqlite";

// dynamic import ensures that the module is loaded after the environment variable is set
const converterModule = await import("../../src/converters/main");
const { getPossibleTargets, getAllTargets, getAllInputs, handleConvert, mainConverter, chunks } =
  converterModule;

// Isolated test database: avoids mutation of ./data/mydb.sqlite
const dbPath = process.env.DB_PATH ?? join(testDbDir, "test.sqlite");
const dbDir = dirname(resolve(dbPath));

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const testDb = new Database(dbPath, { create: true });

// cleans up the table before each test for real isolation (even with parallel tests)
afterEach(() => {
  try {
    testDb.query("DELETE FROM file_names");
  } catch (err) {
    if (err instanceof Error) {
      // ignore only the expected error for missing tables; rethrow real issues
      if (!err.message.includes("no such table")) {
        throw err;
      }
    }
  }
});

// closes the DB and removes the temp directory after all tests finish
afterAll(() => {
  testDb.close();
  rmSync(testDbDir, { recursive: true, force: true });
});

// Mock factory for jobId Cookie to avoid repeated `as Cookie` casts
function createMockJobId(value: string): Cookie<string | undefined> {
  return { value } as Cookie<string | undefined>;
}

test("getPossibleTargets, getAllTargets and getAllInputs include vcf/csv mapping", () => {
  const possible = getPossibleTargets("vcf");
  // should have an entry for the vcf converter
  expect(Object.keys(possible).length).toBeGreaterThan(0);
  // getAllTargets should include 'vcf' converter target csv
  const allTargets = getAllTargets();
  // Be defensive: allTargets.vcf may be undefined in some builds
  expect(allTargets).toHaveProperty("vcf");
  expect(Array.isArray(allTargets.vcf)).toBe(true);
  expect((allTargets.vcf ?? []).includes("csv")).toBe(true);

  const allInputs = getAllInputs("vcf");
  expect(allInputs.includes("vcf")).toBe(true);
});

test("handleConvert uses vcf converter to transform .vcf to .csv and records DB entry", async () => {
  const uploadsDir = "./data/uploads/test-main/";
  const outputDir = "./data/output/test-main/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const fileName = "contact.vcf";
  const inputPath = `${uploadsDir}${fileName}`;
  const sampleVcf = `BEGIN:VCARD
FN:John Doe
N:Doe;John;;;
TEL;TYPE=CELL:123456789
EMAIL:john@example.com
ORG:Example Inc;
END:VCARD
`;
  await writeFile(inputPath, sampleVcf, "utf-8");

  const jobId = createMockJobId("4242");

  await handleConvert([fileName], uploadsDir, outputDir, "csv", "vcf", jobId);

  const outPath = `${outputDir}contact.csv`;
  const out = await readFile(outPath, "utf-8");

  // CSV should contain headers and the name
  expect(out.includes("Full Name")).toBe(true);
  expect(out.includes("John Doe")).toBe(true);

  // cleanup
  await rm(inputPath);
  await rm(outPath);
});

test("handleConvert with unsupported format does not throw", async () => {
  const uploadsDir = "./data/uploads/test-unsupported/";
  const outputDir = "./data/output/test-unsupported/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  // Create a dummy file with unsupported extension
  const fileName = "dummy.xyz123";
  const inputPath = `${uploadsDir}${fileName}`;
  await writeFile(inputPath, "dummy content", "utf-8");

  // Try to convert unsupported format
  const jobId = createMockJobId("unsupported-test");
  // This should not throw, just log that no converter is available
  await expect(
    handleConvert([fileName], uploadsDir, outputDir, "pdf", "xyz123", jobId),
  ).resolves.toBeUndefined();

  await rm(inputPath);
});

test("handleConvert with multiple files processes them", async () => {
  const uploadsDir = "./data/uploads/test-multi/";
  const outputDir = "./data/output/test-multi/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  // Create multiple vcf files
  const files = ["contact1.vcf", "contact2.vcf", "contact3.vcf"];
  const baseVcf = `BEGIN:VCARD
FN:Test Contact
N:Contact;Test;;;
END:VCARD
`;

  for (const fileName of files) {
    await writeFile(`${uploadsDir}${fileName}`, baseVcf, "utf-8");
  }

  const jobId = createMockJobId("multi-test");
  await handleConvert(files, uploadsDir, outputDir, "csv", "vcf", jobId);

  // Verify all output files were created
  for (const fileName of files) {
    const outputFileName = fileName.replace(".vcf", ".csv");
    const outPath = `${outputDir}${outputFileName}`;
    expect(await readFile(outPath, "utf-8")).toBeTruthy();
    await rm(outPath);
  }

  // Cleanup
  for (const fileName of files) {
    await rm(`${uploadsDir}${fileName}`);
  }
});

test("handleConvert with explicit converter skips discovery", async () => {
  const uploadsDir = "./data/uploads/test-explicit/";
  const outputDir = "./data/output/test-explicit/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const fileName = "test.vcf";
  const inputPath = `${uploadsDir}${fileName}`;
  const sampleVcf = `BEGIN:VCARD
FN:Explicit Test
N:Test;Explicit;;;
END:VCARD
`;
  await writeFile(inputPath, sampleVcf, "utf-8");

  // Use explicit vcf converter (avoids discovery loop)
  const jobId = createMockJobId("explicit-test");
  await handleConvert([fileName], uploadsDir, outputDir, "csv", "vcf", jobId);

  const outPath = `${outputDir}test.csv`;
  expect(await readFile(outPath, "utf-8")).toBeTruthy();

  await rm(inputPath);
  await rm(outPath);
});

test("handleConvert with dvisvgm discovers converter from category keys", async () => {
  const uploadsDir = "./data/uploads/test-dvisvgm/";
  const outputDir = "./data/output/test-dvisvgm/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  // Create a simple DVI-like file (dvisvgm would normally handle .dvi files)
  // For testing we'll use a latex file and ask for svg output, which should fail gracefully
  const fileName = "test.tex";
  const inputPath = `${uploadsDir}${fileName}`;
  await writeFile(
    inputPath,
    "\\documentclass{article}\\begin{document}test\\end{document}",
    "utf-8",
  );

  // This tests that converter discovery iterates through all converters
  // and tries to find one matching tex -> svg
  const jobId = createMockJobId("dvi-test");
  await handleConvert([fileName], uploadsDir, outputDir, "svg", "tex", jobId);

  await rm(inputPath);
});

test("handleConvert processes multiple files with vcf converter across categories", async () => {
  const uploadsDir = "./data/uploads/test-vcf-multi/";
  const outputDir = "./data/output/test-vcf-multi/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const baseVcf = `BEGIN:VCARD
FN:Multi Test
N:Test;Multi;;;
TEL:9999
EMAIL:multi@test.com
END:VCARD
`;

  // Create 2 vcf files to test looping through fileNames
  const files = ["a.vcf", "b.vcf"];
  for (const f of files) {
    await writeFile(`${uploadsDir}${f}`, baseVcf, "utf-8");
  }

  // Explicit converter to hit the properties access code path
  const jobId = createMockJobId("vcf-multi-test");
  await handleConvert(files, uploadsDir, outputDir, "csv", "vcf", jobId);

  for (const f of files) {
    const csvName = f.replace(".vcf", ".csv");
    expect(await readFile(`${outputDir}${csvName}`, "utf-8")).toBeTruthy();
    await rm(`${outputDir}${csvName}`);
  }

  for (const f of files) {
    await rm(`${uploadsDir}${f}`);
  }
});

test("chunks with size 0 returns entire array as single chunk", () => {
  const arr = [1, 2, 3, 4, 5];
  const result = chunks(arr, 0);
  expect(result).toEqual([[1, 2, 3, 4, 5]]);
});

test("chunks with negative size returns entire array as single chunk", () => {
  const arr = ["a", "b", "c"];
  const result = chunks(arr, -1);
  expect(result).toEqual([["a", "b", "c"]]);
});

test("chunks with size larger than array returns single chunk", () => {
  const arr = [1, 2];
  const result = chunks(arr, 10);
  expect(result).toEqual([[1, 2]]);
});

test("chunks with exact division returns equal-sized chunks", () => {
  const arr = [1, 2, 3, 4, 5, 6];
  const result = chunks(arr, 2);
  expect(result).toEqual([
    [1, 2],
    [3, 4],
    [5, 6],
  ]);
});

test("mainConverter returns 'File type not supported' for unsupported combination", async () => {
  const result = await mainConverter("test.xyz", "xyz", "abc", "out.abc");
  expect(result).toBe("File type not supported");
});

test("mainConverter auto-discovers converter when not specified", async () => {
  const uploadsDir = "./data/uploads/test-discover/";
  const outputDir = "./data/output/test-discover/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const fileName = "test.vcf";
  const inputPath = `${uploadsDir}${fileName}`;
  const outPath = `${outputDir}test.csv`;
  const sampleVcf = `BEGIN:VCARD
FN:Discover Test
N:Test;Discover;;;
END:VCARD
`;
  await writeFile(inputPath, sampleVcf, "utf-8");

  // Call mainConverter without explicit converterName to trigger discovery
  const result = await mainConverter(inputPath, "vcf", "csv", outPath, undefined, undefined);
  expect(result).toBe("Done");
  expect(await readFile(outPath, "utf-8")).toBeTruthy();

  await rm(inputPath);
  await rm(outPath);
});

test("mainConverter returns 'Failed, check logs' when converter throws", async () => {
  // Try with a file that might cause issues (non-existent input)
  // This should trigger the catch block
  const result = await mainConverter(
    "/nonexistent/path.vcf",
    "vcf",
    "csv",
    "out.csv",
    undefined,
    "vcf",
  );
  expect(result).toBe("Failed, check logs");
});

test("handleConvert with normalization covers fileTypeOrig variations", async () => {
  const uploadsDir = "./data/uploads/test-normalize/";
  const outputDir = "./data/output/test-normalize/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  // Use a file extension that gets normalized (e.g., .htm -> .html)
  const fileName = "index.htm";
  const inputPath = `${uploadsDir}${fileName}`;
  const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>Test Content</body>
</html>`;
  await writeFile(inputPath, sampleHtml, "utf-8");

  // htm normalizes to html; libreoffice can handle html -> pdf
  const jobId = createMockJobId("normalize-test");
  await handleConvert([fileName], uploadsDir, outputDir, "pdf", "htm", jobId);

  await rm(inputPath);
  // PDF output may or may not exist depending on soffice availability, so we don't check it
});

test("handleConvert with explicit converter processes VCF to CSV", async () => {
  const uploadsDir = "./data/uploads/test-main-extra/";
  const outputDir = "./data/output/test-main-extra/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const fileName = "contact.vcf";
  const inputPath = `${uploadsDir}${fileName}`;
  const outPath = `${outputDir}contact.csv`;
  const sampleVcf = `BEGIN:VCARD
FN:Jane Roe
N:Roe;Jane;;;
TEL;TYPE=CELL:555
EMAIL:jane@example.com
END:VCARD
`;
  await writeFile(inputPath, sampleVcf, "utf-8");

  // Call handleConvert with an explicit converter name ("vcf") to transform VCF to CSV
  const jobId = createMockJobId("discovery-test");
  await handleConvert([fileName], uploadsDir, outputDir, "csv", "vcf", jobId);

  const out = await readFile(outPath, "utf-8");
  expect(out.includes("Jane Roe")).toBe(true);

  await rm(inputPath);
  await rm(outPath);
});

test("handleConvert handles files without extension by appending output extension", async () => {
  const uploadsDir = "./data/uploads/test-main-noext/";
  const outputDir = "./data/output/test-main-noext/";
  await mkdir(uploadsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const fileName = "noextfile"; // no extension
  const inputPath = `${uploadsDir}${fileName}`;
  const sampleVcf = `BEGIN:VCARD
FN:No Ext
N:Ext;No;;;
END:VCARD
`;
  await writeFile(inputPath, sampleVcf, "utf-8");

  const outPath = `${outputDir}${fileName}.csv`;
  // Call handleConvert with explicit vcf converter (no extension on input)
  const jobId = createMockJobId("noext-test");
  await handleConvert([fileName], uploadsDir, outputDir, "csv", "vcf", jobId);

  await rm(inputPath);
  await rm(outPath);
});
