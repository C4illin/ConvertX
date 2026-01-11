import { expect, test, describe } from "bun:test";
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

  test("should handle empty data", () => {
    const result = toCSV([]);
    expect(result).toBe("");
  });
});

describe("convert", () => {
  test("should be a function", () => {
    expect(typeof convert).toBe("function");
  });
});
