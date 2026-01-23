import { execFile as execFileOriginal } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { dirname, basename } from "node:path";
import type { ExecFileFn } from "./types";

/**
 * OCRmyPDF Content Engine
 *
 * 將掃描版 PDF 轉換為可搜尋 PDF（加入文字層）
 * 使用 Tesseract OCR 進行文字辨識
 *
 * 支援的 OCR 語言（Docker 內建）：
 *   - eng: 英文
 *   - chi_tra: 繁體中文
 *   - chi_sim: 簡體中文
 *   - jpn: 日文
 *   - kor: 韓文
 *   - deu: 德文
 *   - fra: 法文
 *
 * UI 顯示格式：
 *   - pdf-ocr: 自動檢測語言（推薦，支援多語言文件）
 *   - pdf-en, pdf-zh-TW, pdf-ja 等：指定單一語言
 *
 * 多語言自動檢測模式：
 *   使用 Tesseract 的多語言組合 eng+chi_tra+chi_sim+jpn+kor+deu+fra
 *   可處理包含多種語言的文件（如中英混排）
 */

// 內建支援的 OCR 語言
const SUPPORTED_LANGUAGES = [
  "ocr", // 自動檢測（多語言）- 推薦
  "en", // English
  "zh-TW", // 繁體中文
  "zh", // 簡體中文
  "ja", // 日本語
  "ko", // 한국어
  "de", // Deutsch
  "fr", // Français
] as const;

// Tesseract 語言代碼映射（UI 代碼 → Tesseract 代碼）
const LANG_MAP: Record<string, string> = {
  // 自動檢測模式：使用所有已安裝的語言包
  // 順序：英文優先（最常見），然後是 CJK 語言，最後是歐洲語言
  ocr: "eng+chi_tra+chi_sim+jpn+kor+deu+fra",
  auto: "eng+chi_tra+chi_sim+jpn+kor+deu+fra",
  en: "eng",
  "zh-TW": "chi_tra",
  zh: "chi_sim",
  ja: "jpn",
  ko: "kor",
  de: "deu",
  fr: "fra",
};

export const properties = {
  from: {
    document: ["pdf"],
  },
  to: {
    document: SUPPORTED_LANGUAGES.map((lang) => `pdf-${lang}`),
  },
};

// 建立大小寫不敏感的語言映射查找表
const LANG_MAP_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(LANG_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

/**
 * 從 convertTo 格式中提取 OCR 語言
 * @param convertTo 格式如 "pdf-en" 或 "pdf-zh-TW"
 * @returns Tesseract OCR 語言代碼
 */
function extractOcrLanguage(convertTo: string): string {
  // convertTo 格式: pdf-<lang>
  const match = convertTo.match(/^pdf-(.+)$/i);
  if (!match || !match[1]) {
    throw new Error(`Invalid convertTo format: ${convertTo}. Expected pdf-<lang>`);
  }

  const uiLang = match[1];
  // 轉換為 Tesseract 語言代碼（大小寫不敏感查找）
  const tessLang = LANG_MAP_LOWER[uiLang.toLowerCase()] || uiLang.replace(/-/g, "_");
  return tessLang;
}

/**
 * 格式化檔案大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 執行 ocrmypdf 進行 PDF OCR 處理
 *
 * @param inputPath 輸入 PDF 路徑
 * @param outputPath 輸出 PDF 路徑
 * @param lang OCR 語言
 * @param execFile execFile 函數
 */
function runOcrMyPdf(
  inputPath: string,
  outputPath: string,
  lang: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[OCRmyPDF] ========================================`);
    console.log(`[OCRmyPDF] 🔍 開始 PDF OCR 處理`);
    console.log(`[OCRmyPDF] ========================================`);

    // 階段 1：驗證輸入檔案
    console.log(`[OCRmyPDF] 📋 階段 1/5：驗證輸入檔案`);
    if (!existsSync(inputPath)) {
      reject(new Error(`Input file not found: ${inputPath}`));
      return;
    }
    const inputStats = statSync(inputPath);
    console.log(`[OCRmyPDF]    ✅ 輸入檔案: ${basename(inputPath)}`);
    console.log(`[OCRmyPDF]    ✅ 檔案大小: ${formatFileSize(inputStats.size)}`);

    // 階段 2：準備 OCR 參數
    console.log(`[OCRmyPDF] 📋 階段 2/5：準備 OCR 參數`);
    const isMultiLang = lang.includes("+");
    if (isMultiLang) {
      console.log(`[OCRmyPDF]    ✅ OCR 模式: 多語言自動檢測`);
      console.log(`[OCRmyPDF]    ✅ 語言包: ${lang.split("+").join(", ")}`);
    } else {
      console.log(`[OCRmyPDF]    ✅ OCR 語言: ${lang}`);
    }

    const args = [
      "-l",
      lang,
      "--skip-text", // 跳過已有文字的頁面
      "--optimize",
      "1", // 輕度優化
      "--deskew", // 自動校正傾斜
      "--rotate-pages", // 自動偵測頁面方向
      "--jobs",
      "2", // 使用 2 個並行處理
      inputPath,
      outputPath,
    ];
    console.log(`[OCRmyPDF]    ✅ 參數: --skip-text --optimize 1 --deskew --rotate-pages`);

    // 階段 3：執行 OCR
    console.log(`[OCRmyPDF] 📋 階段 3/5：執行 Tesseract OCR...`);
    console.log(`[OCRmyPDF]    ⏳ 處理中（大型 PDF 可能需要數分鐘）...`);
    const startTime = Date.now();

    execFile("ocrmypdf", args, (error: Error | null, stdout: string, stderr: string) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (error) {
        // 階段 3 失敗處理
        console.log(`[OCRmyPDF]    ❌ OCR 處理失敗（耗時 ${elapsed}s）`);

        // 檢查特定錯誤類型
        if (stderr && stderr.includes("PriorOcrFoundError")) {
          console.log(`[OCRmyPDF] 📋 階段 4/5：PDF 已有文字層，跳過 OCR`);
          console.log(`[OCRmyPDF]    ✅ 複製原始檔案...`);
          try {
            copyFileSync(inputPath, outputPath);
            console.log(`[OCRmyPDF] 📋 階段 5/5：完成`);
            console.log(`[OCRmyPDF]    ✅ 輸出: ${basename(outputPath)}`);
            console.log(`[OCRmyPDF] ========================================`);
            console.log(`[OCRmyPDF] ✅ OCR 完成（PDF 已有文字層）`);
            console.log(`[OCRmyPDF] ========================================`);
            resolve(outputPath);
            return;
          } catch (copyError) {
            reject(new Error(`Failed to copy already-OCRed PDF: ${copyError}`));
            return;
          }
        }

        if (stderr && stderr.includes("EncryptedPdfError")) {
          console.log(`[OCRmyPDF]    ❌ PDF 已加密，無法處理`);
          reject(new Error("PDF is encrypted. Please decrypt it first."));
          return;
        }

        if (stderr && stderr.includes("InputFileError")) {
          console.log(`[OCRmyPDF]    ❌ PDF 檔案無效或損壞`);
          reject(new Error("Invalid or corrupted PDF file."));
          return;
        }

        console.log(`[OCRmyPDF]    錯誤訊息: ${stderr || error.message}`);
        reject(new Error(`ocrmypdf error: ${error}\nstderr: ${stderr}`));
        return;
      }

      // 階段 3 成功
      console.log(`[OCRmyPDF]    ✅ OCR 引擎處理完成（耗時 ${elapsed}s）`);

      if (stdout) {
        console.log(`[OCRmyPDF]    stdout: ${stdout}`);
      }

      // 階段 4：驗證輸出
      console.log(`[OCRmyPDF] 📋 階段 4/5：驗證輸出檔案`);
      if (!existsSync(outputPath)) {
        console.log(`[OCRmyPDF]    ❌ 輸出檔案未生成`);
        reject(new Error(`OCR output file not found: ${outputPath}`));
        return;
      }

      const outputStats = statSync(outputPath);
      console.log(`[OCRmyPDF]    ✅ 輸出檔案: ${basename(outputPath)}`);
      console.log(`[OCRmyPDF]    ✅ 檔案大小: ${formatFileSize(outputStats.size)}`);

      // 階段 5：完成
      console.log(`[OCRmyPDF] 📋 階段 5/5：處理完成`);
      console.log(`[OCRmyPDF] ========================================`);
      console.log(`[OCRmyPDF] ✅ OCR 處理成功完成！`);
      console.log(`[OCRmyPDF]    📥 輸入: ${formatFileSize(inputStats.size)}`);
      console.log(`[OCRmyPDF]    📤 輸出: ${formatFileSize(outputStats.size)}`);
      console.log(`[OCRmyPDF]    ⏱️ 耗時: ${elapsed}s`);
      console.log(`[OCRmyPDF] ========================================`);

      resolve(outputPath);
    });
  });
}

/**
 * 主要轉換函數
 *
 * @param filePath 輸入 PDF 檔案路徑
 * @param fileType 檔案類型（應為 "pdf"）
 * @param convertTo 目標格式（如 "pdf-en"、"pdf-zh-TW"）
 * @param targetPath 輸出路徑
 * @param _options 額外選項
 * @param execFile execFile 函數（用於測試注入）
 */
export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  _options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  console.log(``);
  console.log(`[OCRmyPDF] ╔════════════════════════════════════════╗`);
  console.log(`[OCRmyPDF] ║     OCRmyPDF - PDF OCR 處理引擎       ║`);
  console.log(`[OCRmyPDF] ╚════════════════════════════════════════╝`);
  console.log(``);

  try {
    // 步驟 1：解析參數
    console.log(`[OCRmyPDF] 🔧 解析轉換參數...`);
    const ocrLang = extractOcrLanguage(convertTo);
    console.log(`[OCRmyPDF]    輸入格式: ${fileType}`);
    console.log(`[OCRmyPDF]    目標格式: ${convertTo}`);
    console.log(`[OCRmyPDF]    OCR 語言: ${ocrLang}`);

    // 步驟 2：確保輸出目錄存在
    console.log(`[OCRmyPDF] 📁 準備輸出目錄...`);
    const outputDir = dirname(targetPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log(`[OCRmyPDF]    ✅ 建立目錄: ${outputDir}`);
    } else {
      console.log(`[OCRmyPDF]    ✅ 目錄已存在`);
    }

    // 步驟 3：執行 OCR
    console.log(`[OCRmyPDF] 🚀 開始 OCR 處理...`);
    await runOcrMyPdf(filePath, targetPath, ocrLang, execFile);

    console.log(``);
    console.log(`[OCRmyPDF] ╔════════════════════════════════════════╗`);
    console.log(`[OCRmyPDF] ║     ✅ PDF OCR 處理完成！              ║`);
    console.log(`[OCRmyPDF] ╚════════════════════════════════════════╝`);
    console.log(``);

    return "Done";
  } catch (error) {
    console.log(``);
    console.log(`[OCRmyPDF] ╔════════════════════════════════════════╗`);
    console.log(`[OCRmyPDF] ║     ❌ PDF OCR 處理失敗                ║`);
    console.log(`[OCRmyPDF] ╚════════════════════════════════════════╝`);
    console.log(`[OCRmyPDF] 錯誤: ${error}`);
    console.log(``);
    throw new Error(`OCRmyPDF error: ${error}`);
  }
}
