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
    calc: [
      "csv",
      "dbf",
      "dif",
      "fods",
      "ods",
      "ots",
      "sxc",
      "stc",
      "slk",
      "tab",
      "tsv",
      "xls",
      "xlsb",
      "xlsm",
      "xlsx",
      "xlt",
      "xltm",
      "xltx",
    ],
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
    calc: ["csv", "fods", "html", "ods", "ots", "pdf", "tsv", "xls", "xlsm", "xlsx", "xlt", "xltm"],
  },
};

type FileCategories = "text" | "calc";

// Separate input and output filter maps because some formats (e.g. csv) are
// readable by LibreOffice Writer but cannot be exported by it — Writer has no
// CSV export filter.  Using a unified map caused "no export filter found" when
// converting any Writer document to CSV (issue #561).
const inputFilters: Record<FileCategories, Record<string, string | null>> = {
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
    dbf: "dBase",
    dif: "DIF",
    fods: "OpenDocument Spreadsheet Flat XML",
    html: "HTML (StarCalc)",
    ods: "calc8",
    ots: "calc8_template",
    pdf: "calc_pdf_Export",
    sxc: "StarOffice XML (Calc)",
    stc: "calc_StarOffice_XML_Calc_Template",
    slk: "SYLK",
    tab: "Text - txt - csv (StarCalc)",
    tsv: "Text - txt - csv (StarCalc)",
    xls: "MS Excel 97",
    xlsb: "Calc MS Excel 2007 Binary",
    // Per LibreOffice's own filter table, xlsm is "...VBA XML" but xltm is
    // "...XML Template" with no VBA in the name - the macro-template filter
    // doesn't get a distinct name from the plain xltx one.
    xlsm: "Calc MS Excel 2007 VBA XML",
    xlsx: "Calc MS Excel 2007 XML",
    xlt: "MS Excel 97 Vorlage",
    xltm: "Calc MS Excel 2007 XML Template",
    xltx: "Calc MS Excel 2007 XML Template",
  },
};

const outputFilters: Record<FileCategories, Record<string, string>> = {
  text: {
    // csv intentionally absent: LibreOffice Writer has no CSV export filter
    doc: "MS Word 97",
    docm: "MS Word 2007 XML VBA",
    docx: "MS Word 2007 XML",
    dot: "MS Word 97 Vorlage",
    dotx: "MS Word 2007 XML Template",
    dotm: "MS Word 2007 XML Template",
    epub: "EPUB",
    fodt: "OpenDocument Text Flat XML",
    htm: "HTML (StarWriter)",
    html: "HTML (StarWriter)",
    odt: "writer8",
    ott: "writer8_template",
    rtf: "Rich Text Format",
    tab: "Text",
    tsv: "Text",
    txt: "Text",
    wps: "MS Word 97",
    wpt: "MS Word 97 Vorlage",
    xhtml: "HTML (StarWriter)",
    xml: "OpenDocument Text Flat XML",
  },
  calc: {
    csv: "Text - txt - csv (StarCalc)",
    fods: "OpenDocument Spreadsheet Flat XML",
    html: "HTML (StarCalc)",
    ods: "calc8",
    ots: "calc8_template",
    tsv: "Text - txt - csv (StarCalc)",
    xls: "MS Excel 97",
    xlsm: "Calc MS Excel 2007 VBA XML",
    xlsx: "Calc MS Excel 2007 XML",
    xlt: "MS Excel 97 Vorlage",
    xltm: "Calc MS Excel 2007 XML Template",
  },
};

const getFilters = (fileType: string, converto: string) => {
  if (converto === "pdf") {
    return [null, null];
  } else if (fileType in inputFilters.text && converto in outputFilters.text) {
    return [inputFilters.text[fileType], outputFilters.text[converto]];
  } else if (fileType in inputFilters.calc && converto in outputFilters.calc) {
    return [inputFilters.calc[fileType], outputFilters.calc[converto]];
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
export { inputFilters, outputFilters, getFilters };
