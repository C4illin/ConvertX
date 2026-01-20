import { execFile as execFileOriginal } from "node:child_process";
import { existsSync as existsSyncOriginal } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ExecFileFn } from "./types";

// ==============================================================================
// LibreOffice 轉換器
// ==============================================================================
//
// 🔑 關鍵技術說明：
//
// LibreOffice 有兩種轉換模式：
//
// 1. Export Pipeline（輸出轉換）
//    - 用於：DOCX → PDF, ODT → PDF 等
//    - 原生格式 → 導出格式
//    - 使用 --convert-to 參數
//
// 2. Import Pipeline（輸入轉換）
//    - 用於：PDF → DOCX, PDF → ODT 等
//    - 非原生格式 → 原生格式
//    - 必須使用 --infilter 參數指定 import filter
//
// ⚠️ 常見錯誤：
//    PDF → DOCX 若不指定 --infilter=writer_pdf_import
//    會得到 "no export filter" 錯誤
//
// ==============================================================================

// 用於測試的依賴注入類型
export type ExistsSyncFn = (path: string) => boolean;

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
      "wps",
      "wpt",
      "xhtml",
      "xml",
    ],
  },
};

type FileCategories = "text" | "calc";

const filters: Record<FileCategories, Record<string, string>> = {
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
    pdf: "writer_pdf_Export", // PDF 作為輸出格式
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
    xml: "OpenDocument Text Flat XML",
    zabw: "AbiWord",
  },
  calc: {},
};

// ==============================================================================
// PDF Import Filter（PDF 作為輸入格式時使用）
// ==============================================================================
const PDF_IMPORT_FILTER = "writer_pdf_import";

// 需要使用 PDF import pipeline 的情況
function needsPdfImportPipeline(inputExt: string, outputExt: string): boolean {
  return inputExt === "pdf" && ["docx", "doc", "odt", "rtf", "txt", "html"].includes(outputExt);
}

const getFilters = (fileType: string, converto: string) => {
  if (fileType in filters.text && converto in filters.text) {
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
  existsSync: ExistsSyncFn = existsSyncOriginal,
): Promise<string> {
  const outputDir = dirname(targetPath).replace("./", "") || ".";
  const inputFileName = basename(filePath);
  const inputBaseName = inputFileName.replace(/\.[^.]+$/, "");
  const expectedOutputFile = join(outputDir, `${inputBaseName}.${convertTo}`);

  // Build arguments array
  const args: string[] = [];
  args.push("--headless");

  // ==============================================================================
  // 關鍵分流：PDF → 文字格式 vs 其他轉換
  // ==============================================================================
  if (needsPdfImportPipeline(fileType, convertTo)) {
    // PDF → DOCX/ODT 等：必須使用 import pipeline
    console.log(`[LibreOffice] Using PDF import pipeline: ${fileType} → ${convertTo}`);
    args.push(`--infilter=${PDF_IMPORT_FILTER}`);

    // 輸出格式仍需指定 filter
    const outFilter = filters.text[convertTo];
    if (outFilter && convertTo !== "pdf") {
      args.push("--convert-to", `${convertTo}:${outFilter}`);
    } else {
      args.push("--convert-to", convertTo);
    }
  } else {
    // 一般轉換流程（export pipeline）
    const [inFilter, outFilter] = getFilters(fileType, convertTo);

    if (inFilter && fileType !== "pdf") {
      args.push(`--infilter=${inFilter}`);
    }

    if (outFilter) {
      args.push("--convert-to", `${convertTo}:${outFilter}`);
    } else {
      args.push("--convert-to", convertTo);
    }
  }

  args.push("--outdir", outputDir, filePath);

  console.log(`[LibreOffice] Command: soffice ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    execFile("soffice", args, (error, stdout, stderr) => {
      // ==============================================================================
      // 錯誤處理與輸出檔案驗證
      // ==============================================================================

      if (stdout) {
        console.log(`[LibreOffice] stdout: ${stdout}`);
      }

      if (stderr) {
        console.error(`[LibreOffice] stderr: ${stderr}`);
      }

      // 檢查 LibreOffice 執行錯誤
      if (error) {
        const errorMsg = getLibreOfficeErrorMessage(error, stderr);
        console.error(`[LibreOffice] Error: ${errorMsg}`);
        reject(errorMsg);
        return;
      }

      // ==============================================================================
      // 關鍵防呆：檢查輸出檔案是否實際存在
      // ==============================================================================
      if (!existsSync(expectedOutputFile)) {
        const errorMsg = `LibreOffice 轉換失敗：輸出檔案不存在 (${expectedOutputFile})。可能原因：1) 輸入檔案損壞或加密 2) 缺少必要字型 3) 格式不支援`;
        console.error(`[LibreOffice] ${errorMsg}`);
        reject(errorMsg);
        return;
      }

      console.log(`[LibreOffice] Successfully created: ${expectedOutputFile}`);
      resolve("Done");
    });
  });
}

// ==============================================================================
// 錯誤訊息解析
// ==============================================================================
function getLibreOfficeErrorMessage(
  error: Error & { code?: number | string },
  stderr: string,
): string {
  const stderrLower = stderr.toLowerCase();

  // 常見錯誤類型判斷
  if (stderrLower.includes("no export filter")) {
    return "LibreOffice 錯誤：找不到 export filter。可能是格式不支援或需要使用不同的轉換路徑。";
  }

  if (stderrLower.includes("password") || stderrLower.includes("encrypted")) {
    return "LibreOffice 錯誤：檔案已加密或需要密碼。請先解除密碼保護。";
  }

  if (stderrLower.includes("corrupt") || stderrLower.includes("damaged")) {
    return "LibreOffice 錯誤：檔案已損壞或格式無效。";
  }

  if (error.code === "ENOENT") {
    return "LibreOffice 錯誤：找不到 soffice 執行檔。請確認 LibreOffice 已正確安裝。";
  }

  // 通用錯誤
  return `LibreOffice 轉換失敗 (exit code: ${error.code || "unknown"}): ${stderr || error.message}`;
}
