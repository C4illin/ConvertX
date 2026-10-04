import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    text: [
      "602",
      "abw",
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
    calc: ["csv", "ods", "tsv", "xls", "xlsx"],
  },
  to: {
    text: [
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
      "txt",
      "wps",
      "wpt",
      "xhtml",
      "xml",
    ],
    calc: ["csv", "ods", "pdf", "tsv", "xls", "xlsx", "ots", "xlsm", "xlt", "xltm"],
  },
};

type FileCategories = "text" | "calc";

const filters: Record<FileCategories, Record<string, string | null>> = {
  text: {
    "602": "T602Document",
    abw: "AbiWord",
    csv: "Text",
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
    lwp: "LotusWordPro",
    lrf: "BroadBand eBook",
    odt: "writer8",
    ott: "writer8_template",
    pages: "Apple Pages",
    pdf: "writer_pdf_import",
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
    // .wps is Microsoft Works, not MS Word 97/.doc - forcing the "MS Word 97"
    // filter makes soffice reject a genuine Works document with "source file
    // could not be loaded", even though it converts the same file fine with
    // no --infilter at all (LibreOffice auto-detects it correctly).

    // null is deliberate for BOTH directions here, not just the import side:
    // this map feeds both --infilter (import) and the --convert-to suffix
    // (export). On import, null lets LibreOffice auto-detect - its Works
    // import filter (MS_Works, libwps-backed) is import-only, so it can only
    // be reached via auto-detection anyway. On export, LibreOffice has no
    // Works export filter at all; bare `--convert-to wps` falls back to its
    // default export filter for the extension, which is "MS Word 97" - the
    // exact filter this map pinned before, so export output is unchanged.
    wps: null,
    wpt: "MS Word 97 Vorlage",
    wri: "MS_Write",
    xhtml: "HTML (StarWriter)",
    xml: "OpenDocument Text Flat XML",
    zabw: "AbiWord",
  },
  calc: {
    csv: "Text - txt - csv (StarCalc)",
    ods: "calc8",
    ots: "calc8_template",
    pdf: "calc_pdf_Export",
    tsv: "Text - txt - csv (StarCalc)",
    xls: "MS Excel 97",
    xlsx: "Calc MS Excel 2007 XML",
    xlsm: "Calc MS Excel 2007 XML VBA",
    xlt: "MS Excel 97 Vorlage",
    xltm: "Calc MS Excel 2007 XML Template",
  },
};

const getFilters = (fileType: string, converto: string) => {
  if (converto === "pdf") {
    return [null, null];
  } else if (fileType in filters.text && converto in filters.text) {
    return [filters.text[fileType], filters.text[converto]];
  } else if (fileType in filters.calc && converto in filters.calc) {
    return [filters.calc[fileType], filters.calc[converto]];
  }
  return [null, null];
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  const outputPath = targetPath.split("/").slice(0, -1).join("/").replace("./", "") ?? targetPath;

  // Build arguments array
  const args: string[] = [];
  args.push("--headless");
  const [inFilter, outFilter] = getFilters(fileType, convertTo);

  if (inFilter) {
    args.push(`--infilter=${inFilter}`);
  }

  if (outFilter) {
    args.push("--convert-to", `${convertTo}:${outFilter}`, "--outdir", outputPath, filePath);
  } else {
    args.push("--convert-to", convertTo, "--outdir", outputPath, filePath);
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

/**
 * @internal For testing only. Do not use in production.
 * Tests need direct access to cover all filters.
 */
export { filters, getFilters };
