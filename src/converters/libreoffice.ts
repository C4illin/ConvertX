import { execFile } from "node:child_process";

export const properties = {
  from: {
    text: [
      "602",
      "abw",
      "csv",
      "cwk",
      "doc",
      "docm",
      "docx",
      "dot",
      "dotx",
      "dotm",
      "epub",
      "fb2",
      "fodt",
      "htm",
      "html",
      "hwp",
      "mcw",
      "mw",
      "mwd",
      "lwp",
      "lrf",
      "odt",
      "ott",
      "pages",
      "pdf",
      "psw",
      "rtf",
      "sdw",
      "stw",
      "sxw",
      "tab",
      "tsv",
      "txt",
      "wn",
      "wpd",
      "wps",
      "wpt",
      "wri",
      "xhtml",
      "xml",
      "zabw",
    ],
  },
  to: {
    text: [
      "csv",
      "doc",
      "docm",
      "docx",
      "dot",
      "dotx",
      "dotm",
      "epub",
      "fodt",
      "htm",
      "html",
      "odt",
      "ott",
      "pdf",
      "rtf",
      "tab",
      "tsv",
      "txt",
      "wpd",
      "wps",
      "wpt",
      "xhtml",
      "xml",
    ],
  },
};

// input/output files parsing method
const filters: Record<string, Record<string, string>> = {
  text: {
    "602": "T602Document",
    abw: "AbiWord",
    csv: "Text",
    cwk: "ClarisWorks",
    doc: "MS Word 97",
    docm: "MS Word 2007 XML VBA",
    docx: "MS Word 2007 XML",
    dot: "MS Word 97 Vorlage",
    dotx: "MS Word 2007 XML Template",
    dotm: "MS Word 2007 XML Template",
    epub: "EPUB",
    fb2: "Fictionbook 2",
    fodt: "OpenDocument Text Flat XML",
    htm: "HTML (StarWriter)",
    html: "HTML (StarWriter)",
    hwp: "writer_MIZI_Hwp_97",
    mcw: "MacWrite",
    mw: "MacWrite",
    mwd: "Mariner_Write",
    lwd: "LotusWordPro",
    lrf: "BroadBand eBook",
    odt: "writer8",
    ott: "writer8_template",
    pages: "Apple Pages",
    //pdf should differentiate between import and export just leave as default for now
    psw: "PocketWord File",
    rtf: "Rich Text Format",
    sdw: "StarOffice_Writer",
    stw: "writer_StarOffice_XML_Writer_Template",
    sxw: "StarOffice XML (Writer)",
    tab: "Text",
    tsv: "Text",
    txt: "Text",
    wn: "WriteNow",
    wpd: "WordPerfect",
    wps: "MS Word 97",
    wpt: "MS Word 97 Vorlage",
    wri: "MS_Write",
    xhtml: "HTML (StarWriter)",
    zabw: "AbiWord",
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: unknown,
): Promise<string> {
  const outputPath = targetPath.split("/").slice(0, -1).join("/").replace("./", "");

  // Build arguments array
  const args: string[] = [];

  args.push("--headless");
  args.push("--outdir", outputPath);

  const inFilter = filters[fileType];
  if (inFilter) {
    args.push(`--infilter="${inFilter}"`);
  }
  const outFilter = filters[convertTo];
  if (outFilter) {
    args.push("--convert-to", `"${convertTo}:${outFilter}"`, filePath);
  } else {
    args.push("--convert-to", convertTo, filePath);
  }

  return new Promise((resolve, reject) => {
    execFile("soffice", args, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}`);
      }

      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      resolve("Done");
    });
  });
}
