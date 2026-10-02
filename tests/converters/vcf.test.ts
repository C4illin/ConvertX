import { afterAll, beforeAll, expect, test, describe } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convert, parseVCF, toCSV } from "../../src/converters/vcf";

describe("parseVCF", () => {
  test("should parse a simple VCF card", () => {
    const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
TEL:+123456789
EMAIL:john@example.com
ORG:Example Corp
END:VCARD`;

    const result = parseVCF(vcfData);

    expect(result).toEqual([
      {
        "Full Name": "John Doe",
        "Last Name": "Doe",
        "First Name": "John",
        Phone: "+123456789",
        Email: "john@example.com",
        Organization: "Example Corp",
      },
    ]);
  });

  test("should handle multiple cards", () => {
    const vcfData = `BEGIN:VCARD
FN:John Doe
END:VCARD
BEGIN:VCARD
FN:Jane Smith
END:VCARD`;

    const result = parseVCF(vcfData);

    expect(result).toEqual([{ "Full Name": "John Doe" }, { "Full Name": "Jane Smith" }]);
  });

  test("should parse VCF with TYPE parameters", () => {
    const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
TEL;TYPE=WORK,VOICE:(111) 555-1212
EMAIL;TYPE=PREF,INTERNET:john.doe@example.com
END:VCARD`;

    const result = parseVCF(vcfData);

    expect(result).toEqual([
      {
        "Full Name": "John Doe",
        "Last Name": "Doe",
        "First Name": "John",
        Phone: "(111) 555-1212",
        Email: "john.doe@example.com",
      },
    ]);
  });

  test("should handle CRLF line endings", () => {
    const vcfData = "BEGIN:VCARD\r\nFN:John Doe\r\nTEL:123\r\nEND:VCARD\r\n";

    expect(parseVCF(vcfData)).toEqual([{ "Full Name": "John Doe", Phone: "123" }]);
  });

  test("should keep colons that are part of the value", () => {
    const vcfData = `BEGIN:VCARD
FN:Dr: Who
END:VCARD`;

    expect(parseVCF(vcfData)).toEqual([{ "Full Name": "Dr: Who" }]);
  });

  test("should default the first name to an empty string when N has only a last name", () => {
    const vcfData = `BEGIN:VCARD
N:Doe
END:VCARD`;

    expect(parseVCF(vcfData)).toEqual([{ "Last Name": "Doe", "First Name": "" }]);
  });

  test("should only use the organization name, not its units", () => {
    const vcfData = `BEGIN:VCARD
ORG:Example Corp;Marketing;Berlin
END:VCARD`;

    expect(parseVCF(vcfData)).toEqual([{ Organization: "Example Corp" }]);
  });

  test("should not mistake properties starting with N for the name", () => {
    const vcfData = `BEGIN:VCARD
FN:John Doe
NOTE:likes cats
NICKNAME:Johnny
END:VCARD`;

    expect(parseVCF(vcfData)).toEqual([{ "Full Name": "John Doe" }]);
  });

  test("should skip lines without a colon", () => {
    const vcfData = `BEGIN:VCARD
FN:John Doe
this line is garbage
END:VCARD`;

    expect(parseVCF(vcfData)).toEqual([{ "Full Name": "John Doe" }]);
  });

  test("should ignore text outside of BEGIN/END blocks", () => {
    const vcfData = `exported by some tool
FN:Not A Contact
BEGIN:VCARD
FN:John Doe
END:VCARD
FN:Also Not A Contact`;

    expect(parseVCF(vcfData)).toEqual([{ "Full Name": "John Doe" }]);
  });

  test("should drop cards that contain no known properties", () => {
    const vcfData = `BEGIN:VCARD
END:VCARD
BEGIN:VCARD
VERSION:3.0
URL:https://example.com
END:VCARD
BEGIN:VCARDEND:VCARD`;

    expect(parseVCF(vcfData)).toEqual([]);
  });

  test("should return an empty list for input without cards", () => {
    expect(parseVCF("")).toEqual([]);
    expect(parseVCF("just some text")).toEqual([]);
  });
});

describe("toCSV", () => {
  test("should convert contacts to CSV", () => {
    const contacts = [
      {
        "Full Name": "John Doe",
        Phone: "+123",
        Email: "john@example.com",
      },
    ];

    const result = toCSV(contacts);

    expect(result).toBe('Full Name,Phone,Email\n"John Doe","+123","john@example.com"');
  });

  test("should escape quotes", () => {
    const contacts = [{ "Full Name": 'John "Johnny" Doe' }];

    const result = toCSV(contacts);

    expect(result).toBe('Full Name\n"John ""Johnny"" Doe"');
  });

  test("should keep commas and newlines inside quoted values", () => {
    const contacts = [{ "Full Name": "Doe, John", Organization: "Line 1\nLine 2" }];

    expect(toCSV(contacts)).toBe('Full Name,Organization\n"Doe, John","Line 1\nLine 2"');
  });

  test("should write an empty cell for values missing in later contacts", () => {
    const contacts = [
      { "Full Name": "John Doe", Email: "john@example.com" },
      { "Full Name": "Jane Smith" },
    ];

    expect(toCSV(contacts)).toBe('Full Name,Email\n"John Doe","john@example.com"\n"Jane Smith",""');
  });

  // BUG: the header is built from the first contact only, so fields that only
  // later contacts have are silently dropped from the export. Remove `.failing`
  // once toCSV builds the header from all contacts.
  test.failing("should not drop fields that only later contacts have", () => {
    const contacts = [{ "Full Name": "John Doe" }, { "Full Name": "Jane Smith", Email: "j@x.com" }];

    expect(toCSV(contacts)).toContain("j@x.com");
  });

  test("should handle empty data", () => {
    const result = toCSV([]);
    expect(result).toBe("");
  });
});

describe("convert", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "convertx-vcf-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("should read the vcf file and write the contacts as csv", async () => {
    const inputPath = join(dir, "contacts.vcf");
    const targetPath = join(dir, "contacts.csv");
    await writeFile(
      inputPath,
      `BEGIN:VCARD
FN:John Doe
EMAIL:john@example.com
END:VCARD
BEGIN:VCARD
FN:Jane Smith
EMAIL:jane@example.com
END:VCARD
`,
    );

    const result = await convert(inputPath, "vcf", "csv", targetPath);

    expect(result).toBe("Done");
    expect(await readFile(targetPath, "utf-8")).toBe(
      'Full Name,Email\n"John Doe","john@example.com"\n"Jane Smith","jane@example.com"',
    );
  });

  test("should write an empty file when the input has no contacts", async () => {
    const inputPath = join(dir, "empty.vcf");
    const targetPath = join(dir, "empty.csv");
    await writeFile(inputPath, "");

    await expect(convert(inputPath, "vcf", "csv", targetPath)).resolves.toBe("Done");
    expect(await readFile(targetPath, "utf-8")).toBe("");
  });

  test("should reject when the input file does not exist", async () => {
    await expect(
      convert(join(dir, "missing.vcf"), "vcf", "csv", join(dir, "missing.csv")),
    ).rejects.toThrow(/ENOENT/);
  });
});
