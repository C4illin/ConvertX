import { readFile, writeFile } from "fs/promises";

export const properties = {
  from: {
    contacts: ["vcf"],
  },
  to: {
    contacts: ["csv"],
  },
};

// Undo vCard text escapes: \, \; \\ and \n
const unescape = (value: string) =>
  value.replace(/\\([,;\\nN])/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));

// Split a structured value (N, ORG) on the ";" separators, not on escaped "\;"
const splitFields = (value: string) => value.split(/(?<!\\);/);

// vCard 2.1 parameters: "ENCODING=QUOTED-PRINTABLE" or a bare "QUOTED-PRINTABLE"
const isQuotedPrintable = (params: string[]) =>
  params.some((param) => /^(ENCODING=)?QUOTED-PRINTABLE$/i.test(param));

// vCard 2.1 exports (Android) write non-ASCII values as quoted-printable bytes in CHARSET
const decodeQuotedPrintable = (value: string, params: string[]) => {
  const bytes = Buffer.from(
    value.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
    "latin1",
  );
  const charset = (params.find((param) => /^CHARSET=/i.test(param))?.slice(8) ||
    "utf-8") as ConstructorParameters<typeof TextDecoder>[0];
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return bytes.toString("utf-8");
  }
};

export function parseVCF(data: string): Record<string, string>[] {
  const cards = data
    .split(/BEGIN:VCARD/)
    .slice(1)
    .map((card) => card.split(/END:VCARD/)[0])
    .filter((card) => card);
  return cards
    .map((card) => {
      if (!card) return {};
      const lines: string[] = [];
      for (const raw of card.split("\n")) {
        const line = raw.replace(/\r$/, "");
        const prev = lines[lines.length - 1];
        if (prev !== undefined && /^[ \t]/.test(line)) {
          // a folded line continues the previous one after its leading space
          lines[lines.length - 1] = prev + line.slice(1);
        } else if (
          prev?.endsWith("=") &&
          isQuotedPrintable((prev.split(":")[0] || "").split(";"))
        ) {
          // a quoted-printable value ending in "=" continues on the next line
          lines[lines.length - 1] = prev.slice(0, -1) + line;
        } else if (line.trim()) {
          lines.push(line);
        }
      }
      const contact: Record<string, string> = {};
      const add = (field: string, value: string) => {
        if (value) contact[field] = contact[field] ? `${contact[field]}; ${value}` : value;
      };
      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;
        // "item1.EMAIL;type=INTERNET" -> name EMAIL, params type=INTERNET
        const [property = "", ...params] = line.slice(0, colonIndex).trim().split(";");
        const key = property.replace(/^[^.]*\./, "").toUpperCase();
        let value = line.slice(colonIndex + 1).trim();
        if (isQuotedPrintable(params)) {
          value = decodeQuotedPrintable(value, params);
        }
        if (key === "FN") {
          contact["Full Name"] = unescape(value);
        } else if (key === "N") {
          const parts = splitFields(value);
          contact["Last Name"] = unescape(parts[0] || "");
          contact["First Name"] = unescape(parts[1] || "");
        } else if (key === "TEL") {
          add("Phone", unescape(value));
        } else if (key === "EMAIL") {
          add("Email", unescape(value));
        } else if (key === "ORG") {
          contact["Organization"] = unescape(splitFields(value)[0] || "");
        }
      }
      return contact;
    })
    .filter((contact) => Object.keys(contact).length > 0);
}

export function toCSV(data: Record<string, string>[]): string {
  if (!data.length) return "";
  const headers = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((key) => headers.add(key));
  }
  const headerArray = Array.from(headers);
  const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
  const rows = data.map((row) => headerArray.map((h) => escape(row[h] || "")).join(","));
  return [headerArray.join(","), ...rows].join("\n");
}

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  const vcfData = await readFile(filePath, "utf-8");
  const contacts = parseVCF(vcfData);
  const csvData = toCSV(contacts);
  await writeFile(targetPath, csvData, "utf-8");
  return "Done";
}
