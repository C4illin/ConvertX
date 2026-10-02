import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Cookie } from "elysia";
import { properties as libreofficeProperties } from "../../src/converters/libreoffice";
import { captureConsole } from "./helpers/converters";

if (!process.env.CONVERTX_TEST_ROOT) {
  // Without tests/preload.ts the db module would open ./data/mydb.sqlite and these tests
  // would write their rows into it.
  throw new Error("Converter tests must run via `bun test` so that tests/preload.ts is loaded.");
}

// dynamic imports ensure that the guard above runs before the db module is loaded
const { default: db } = await import("../../src/db/db");
const { chunks, getAllInputs, getAllTargets, getPossibleTargets, handleConvert, mainConverter } =
  await import("../../src/converters/main");

const testRoot = mkdtempSync(join(tmpdir(), "convertx-main-test-"));

// Every row written by these tests uses this prefix, so cleanup never touches other rows.
const JOB_PREFIX = "main-test-";

type FileRow = { file_name: string; output_file_name: string; status: string };

function jobCookie(name?: string): Cookie<string | undefined> {
  return { value: name === undefined ? undefined : `${JOB_PREFIX}${name}` } as Cookie<
    string | undefined
  >;
}

function rowsFor(name: string, orderBy: "id" | "file_name" = "id"): FileRow[] {
  return db
    .query(
      `SELECT file_name, output_file_name, status FROM file_names WHERE job_id = ? ORDER BY ${orderBy}`,
    )
    .all(`${JOB_PREFIX}${name}`) as FileRow[];
}

const vcard = (fullName: string) => `BEGIN:VCARD\nFN:${fullName}\nEND:VCARD\n`;

let caseCounter = 0;
let uploadsDir: string;
let outputDir: string;
let output: ReturnType<typeof captureConsole>;

beforeEach(() => {
  // handleConvert concatenates dir and file name, so both need a trailing slash
  const caseDir = join(testRoot, `case-${caseCounter++}`);
  uploadsDir = `${join(caseDir, "uploads")}/`;
  outputDir = `${join(caseDir, "output")}/`;
  mkdirSync(uploadsDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  output = captureConsole();
});

afterEach(() => {
  output.restore();
  db.query("DELETE FROM file_names WHERE job_id LIKE ?").run(`${JOB_PREFIX}%`);
});

// removes the temp directory with the uploads and outputs after all tests finish
afterAll(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

describe("converter registry", () => {
  test("getPossibleTargets lists the targets of every converter for an input type", () => {
    expect(getPossibleTargets("vcf")).toEqual({ vcf: ["csv"] });
  });

  test("getPossibleTargets normalizes the input type", () => {
    expect(getPossibleTargets("VCF")).toEqual({ vcf: ["csv"] });
    expect(Object.keys(getPossibleTargets("jpeg")).length).toBeGreaterThan(0);
    expect(getPossibleTargets("JPG")).toEqual(getPossibleTargets("jpeg"));
    expect(getPossibleTargets("htm")).toEqual(getPossibleTargets("html"));
  });

  test("getPossibleTargets returns an empty object for unknown input types", () => {
    expect(getPossibleTargets("xyz123")).toEqual({});
  });

  test("getAllTargets has an entry for every registered converter", () => {
    expect(Object.keys(getAllTargets()).sort()).toEqual([
      "assimp",
      "calibre",
      "dasel",
      "dvisvgm",
      "ffmpeg",
      "graphicsmagick",
      "imagemagick",
      "inkscape",
      "libheif",
      "libjxl",
      "libreoffice",
      "markitDown",
      "msgconvert",
      "pandoc",
      "pdftops",
      "potrace",
      "resvg",
      "vcf",
      "vips",
      "vtracer",
      "xelatex",
    ]);
  });

  test("getAllTargets merges the targets of all categories of a converter", () => {
    const allTargets = getAllTargets();

    expect(allTargets.vcf).toEqual(["csv"]);
    expect(allTargets.libjxl).toEqual([
      "apng",
      "exr",
      "jpeg",
      "pam",
      "pfm",
      "pgm",
      "pgx",
      "png",
      "ppm",
      "jxl",
    ]);
  });

  test("getAllInputs merges the inputs of all categories of a converter", () => {
    expect(getAllInputs("vcf")).toEqual(["vcf"]);
    expect(getAllInputs("libjxl")).toEqual([
      "jxl",
      "apng",
      "exr",
      "gif",
      "jpeg",
      "pam",
      "pfm",
      "pgm",
      "pgx",
      "png",
      "ppm",
    ]);
  });

  test("getAllInputs returns an empty list for unknown converters", () => {
    expect(getAllInputs("doesnotexist")).toEqual([]);
  });

  // BUG: building allTargets/allInputs stores the first category's array by
  // reference and then pushes the other categories into it. That mutates the
  // converters' own properties, so e.g. LibreOffice offers docx -> xlsx and
  // libjxl offers jxl -> jxl. Remove `.failing` once main.ts copies the arrays.
  test.failing("listing all targets and inputs does not leak formats across categories", () => {
    expect(getPossibleTargets("docx").libreoffice).not.toContain("xlsx");
    expect(getPossibleTargets("jxl").libjxl).not.toContain("jxl");
    expect(libreofficeProperties.from.text).not.toContain("xlsx");
    expect(libreofficeProperties.to.text).not.toContain("xlsm");
  });
});

describe("chunks", () => {
  test("chunks with size 0 returns entire array as single chunk", () => {
    expect(chunks([1, 2, 3, 4, 5], 0)).toEqual([[1, 2, 3, 4, 5]]);
  });

  test("chunks with negative size returns entire array as single chunk", () => {
    expect(chunks(["a", "b", "c"], -1)).toEqual([["a", "b", "c"]]);
  });

  test("chunks with size larger than array returns single chunk", () => {
    expect(chunks([1, 2], 10)).toEqual([[1, 2]]);
  });

  test("chunks with exact division returns equal-sized chunks", () => {
    expect(chunks([1, 2, 3, 4, 5, 6], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  test("chunks puts the remainder into a smaller last chunk", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("chunks of an empty array is empty", () => {
    expect(chunks([], 3)).toEqual([]);
  });
});

describe("mainConverter", () => {
  test("returns 'File type not supported' for unsupported combination", async () => {
    expect(await mainConverter("test.xyz", "xyz", "abc", "out.abc")).toBe(
      "File type not supported",
    );
    expect(output.logs).toContain("No available converter supports converting from xyz to abc.");
  });

  test("returns 'File type not supported' for an unknown converter name", async () => {
    const inputPath = `${uploadsDir}contact.vcf`;
    await writeFile(inputPath, vcard("Jane Roe"));

    expect(
      await mainConverter(inputPath, "vcf", "csv", `${outputDir}contact.csv`, {}, "doesnotexist"),
    ).toBe("File type not supported");
  });

  test("auto-discovers converter when not specified", async () => {
    const inputPath = `${uploadsDir}test.vcf`;
    const outPath = `${outputDir}test.csv`;
    await writeFile(inputPath, vcard("Discover Test"));

    expect(await mainConverter(inputPath, "vcf", "csv", outPath)).toBe("Done");
    expect(await readFile(outPath, "utf-8")).toContain("Discover Test");
  });

  test("normalizes the input type before discovering a converter", async () => {
    const inputPath = `${uploadsDir}test.VCF`;
    const outPath = `${outputDir}test.csv`;
    await writeFile(inputPath, vcard("Upper Case"));

    expect(await mainConverter(inputPath, "VCF", "csv", outPath)).toBe("Done");
  });

  test("returns 'Failed, check logs' when converter throws", async () => {
    expect(
      await mainConverter(`${uploadsDir}missing.vcf`, "vcf", "csv", "out.csv", undefined, "vcf"),
    ).toBe("Failed, check logs");
    expect(output.errors.join("\n")).toContain("using vcf");
  });

  test.each([
    ["msgconvert", "mail.eml", "eml", "msg"],
    ["calibre", "news.recipe", "recipe", "epub"],
  ])(
    "returns 'Failed, check logs' when %s refuses the conversion",
    async (converterName, fileName, fileType, convertTo) => {
      expect(
        await mainConverter(
          `${uploadsDir}${fileName}`,
          fileType,
          convertTo,
          `${outputDir}out.${convertTo}`,
          {},
          converterName,
        ),
      ).toBe("Failed, check logs");
      expect(output.errors.join("\n")).toContain(`using ${converterName}`);
    },
  );

  // BUG: discovery loops with `for (converterName in properties)` and only breaks
  // the inner loop, so the variable always ends on the last registered converter.
  // Remove `.failing` once mainConverter stops at the first match.
  test.failing("logs the name of the auto-discovered converter", async () => {
    const inputPath = `${uploadsDir}named.vcf`;
    await writeFile(inputPath, vcard("Named"));

    await mainConverter(inputPath, "vcf", "csv", `${outputDir}named.csv`);

    expect(output.logs.join("\n")).toContain("successfully using vcf");
  });

  // BUG: same root cause - later matches overwrite earlier ones, so emf -> png
  // uses ImageMagick even though Inkscape is registered first on purpose
  // ("Prioritize Inkscape for EMF files"). The input does not exist, so whichever
  // converter is picked fails fast; only the logged converter name matters.
  test.failing("auto-discovery prefers the first registered converter", async () => {
    await mainConverter(`${uploadsDir}missing.emf`, "emf", "png", `${outputDir}missing.png`);

    expect(output.errors.join("\n")).toContain("using inkscape");
  });
});

describe("handleConvert", () => {
  test("converts every file and records one row per file", async () => {
    const files = ["a.vcf", "b.vcf", "c.vcf"];
    for (const fileName of files) {
      await writeFile(`${uploadsDir}${fileName}`, vcard(`Contact ${fileName}`));
    }

    await handleConvert(files, uploadsDir, outputDir, "csv", "vcf", jobCookie("rows"));

    expect(rowsFor("rows", "file_name")).toEqual([
      { file_name: "a.vcf", output_file_name: "a.csv", status: "Done" },
      { file_name: "b.vcf", output_file_name: "b.csv", status: "Done" },
      { file_name: "c.vcf", output_file_name: "c.csv", status: "Done" },
    ]);
    for (const fileName of files) {
      const csv = await readFile(`${outputDir}${fileName.replace(".vcf", ".csv")}`, "utf-8");
      expect(csv).toBe(`Full Name\n"Contact ${fileName}"`);
    }
  });

  test("converts but does not record rows when the job id cookie has no value", async () => {
    // without a job id there is no job_id to look for, so look for the file name instead
    const fileName = `${JOB_PREFIX}no-job.vcf`;
    await writeFile(`${uploadsDir}${fileName}`, vcard("No Job"));

    await handleConvert([fileName], uploadsDir, outputDir, "csv", "vcf", jobCookie());

    expect(db.query("SELECT * FROM file_names WHERE file_name = ?").all(fileName)).toEqual([]);
    expect(await readFile(`${outputDir}${JOB_PREFIX}no-job.csv`, "utf-8")).toContain("No Job");
  });

  test("replaces only the last occurrence of the extension", async () => {
    await writeFile(`${uploadsDir}vcf.backup.vcf`, vcard("Backup"));

    await handleConvert(["vcf.backup.vcf"], uploadsDir, outputDir, "csv", "vcf", jobCookie("ext"));

    expect(rowsFor("ext")).toEqual([
      { file_name: "vcf.backup.vcf", output_file_name: "vcf.backup.csv", status: "Done" },
    ]);
    expect(await readFile(`${outputDir}vcf.backup.csv`, "utf-8")).toContain("Backup");
  });

  test("keeps the base name of files with an upper-case extension", async () => {
    await writeFile(`${uploadsDir}CONTACT.VCF`, vcard("Upper"));

    await handleConvert(["CONTACT.VCF"], uploadsDir, outputDir, "csv", "vcf", jobCookie("upper"));

    expect(rowsFor("upper")).toEqual([
      { file_name: "CONTACT.VCF", output_file_name: "CONTACT.csv", status: "Done" },
    ]);
  });

  test("handles files without extension by appending output extension", async () => {
    await writeFile(`${uploadsDir}noextfile`, vcard("No Ext"));

    await handleConvert(["noextfile"], uploadsDir, outputDir, "csv", "vcf", jobCookie("noext"));

    expect(rowsFor("noext")).toEqual([
      { file_name: "noextfile", output_file_name: "noextfile.csv", status: "Done" },
    ]);
    expect(await readFile(`${outputDir}noextfile.csv`, "utf-8")).toContain("No Ext");
  });

  test("resolves and records the status when no converter supports the conversion", async () => {
    await writeFile(`${uploadsDir}dummy.xyz123`, "dummy content");

    await expect(
      handleConvert(["dummy.xyz123"], uploadsDir, outputDir, "pdf", "xyz123", jobCookie("none")),
    ).resolves.toBeUndefined();

    expect(rowsFor("none")).toEqual([
      {
        file_name: "dummy.xyz123",
        output_file_name: "dummy.pdf",
        status: "File type not supported",
      },
    ]);
  });

  test("rejects when the output directory is missing, so the caller can log it", async () => {
    await writeFile(`${uploadsDir}contact.vcf`, vcard("Lost"));
    const missingDir = `${join(testRoot, "does-not-exist")}/`;

    await expect(
      handleConvert(["contact.vcf"], uploadsDir, missingDir, "csv", "vcf", jobCookie("lost")),
    ).rejects.toThrow(/ENOENT/);
    expect(rowsFor("lost")).toEqual([]);
  });

  test.each([
    ["jpeg", "photo.jpg"],
    ["markdown_strict", "photo.md"],
    ["glb2", "photo.glb"],
    ["stlb", "photo.stl"],
  ])("names the output for target %s with its canonical extension", async (convertTo, expected) => {
    // the conversion itself is unsupported, but the output name is still derived and recorded
    await handleConvert(["photo.JPG"], uploadsDir, outputDir, convertTo, "none", jobCookie("name"));

    expect(rowsFor("name")).toEqual([
      { file_name: "photo.JPG", output_file_name: expected, status: "File type not supported" },
    ]);
  });

  test("records numbered sibling outputs (e.g. one file per page) in numeric order", async () => {
    // converters such as ImageMagick write doc-1.csv, doc-2.csv, ... instead of doc.csv
    for (const fileName of [
      "doc-1.csv",
      "doc-2.csv",
      "doc-10.csv",
      // none of these belong to doc.csv
      "doc-.csv",
      "doc-a.csv",
      "doc-1.txt",
      "mydoc-1.csv",
      "other-1.csv",
    ]) {
      await writeFile(`${outputDir}${fileName}`, "");
    }
    await writeFile(`${uploadsDir}doc.vcf`, vcard("Pages"));

    await handleConvert(["doc.vcf"], uploadsDir, outputDir, "csv", "vcf", jobCookie("pages"));

    expect(rowsFor("pages").map((row) => row.output_file_name)).toEqual([
      "doc-1.csv",
      "doc-2.csv",
      "doc-10.csv",
      "doc.csv",
    ]);
  });
});
