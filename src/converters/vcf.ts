import { readFile, writeFile } from "fs/promises";

export const properties = {
  from: {
    contacts: ["vcf"],
  },
  to: {
    contacts: ["csv"],
  },
};

export function parseVCF(data: string): Record<string, string>[] {
  const cards = data.split(/BEGIN:VCARD/).slice(1).map(card => card.split(/END:VCARD/)[0]).filter(card => card);
  return cards.map(card => {
    if (!card) return {};
    const lines = card.split('\n').filter(line => line.trim());
    const contact: Record<string, string> = {};
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (key === 'FN') {
        contact['Full Name'] = value;
      } else if (key === 'N') {
        const parts = value.split(';');
        contact['Last Name'] = parts[0] || '';
        contact['First Name'] = parts[1] || '';
      } else if (key.startsWith('TEL')) {
        contact['Phone'] = value;
      } else if (key.startsWith('EMAIL')) {
        contact['Email'] = value;
      } else if (key === 'ORG') {
        contact['Organization'] = value.split(';')[0] || '';
      }
    }
    return contact;
  }).filter(contact => Object.keys(contact).length > 0);
}

export function toCSV(data: Record<string, string>[]): string {
  if (!data.length) return '';
  const first = data[0];
  if (!first) return '';
  const headers = Object.keys(first);
  const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
  const rows = data.map(row => headers.map(h => escape(row[h] || '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
): Promise<string> {
  const vcfData = await readFile(filePath, 'utf-8');
  const contacts = parseVCF(vcfData);
  const csvData = toCSV(contacts);
  await writeFile(targetPath, csvData, 'utf-8');
  return "Done";
}
