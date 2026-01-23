import { execFile as execFileOriginal } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import type { ExecFileFn } from "../converters/types";

/**
 * PDF OCR 輔助工具
 *
 * 自動偵測掃描版 PDF 並使用 ocrmypdf 進行 OCR 處理
 * 確保翻譯引擎可以正確提取文字
 */

// OCR 偵測閾值（文字字元數低於此值視為掃描版）
const SCANNED_PDF_TEXT_THRESHOLD = 100;

// 預設 OCR 語言（可透過環境變數覆蓋）
const DEFAULT_OCR_LANG = process.env.OCR_LANG || "eng+chi_tra+chi_sim+jpn";

/**
 * 使用 pdftotext 提取 PDF 中的文字
 *
 * @param pdfPath PDF 檔案路徑
 * @param execFile execFile 函數
 * @returns 提取的文字內容
 */
function extractTextFromPdf(
  pdfPath: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve) => {
    // pdftotext -layout <input.pdf> -
    // -layout: 保持排版
    // -: 輸出到 stdout
    execFile("pdftotext", ["-layout", pdfPath, "-"], (error, stdout, stderr) => {
      if (error) {
        // pdftotext 失敗可能是因為 PDF 沒有文字層
        console.warn(`[PDF-OCR] pdftotext failed: ${stderr}`);
        resolve(""); // 返回空字串，視為掃描版
        return;
      }
      resolve(stdout || "");
    });
  });
}

/**
 * 偵測 PDF 是否為掃描版（無文字層）
 *
 * @param pdfPath PDF 檔案路徑
 * @param execFile execFile 函數
 * @returns 是否為掃描版 PDF
 */
export async function isScannedPdf(
  pdfPath: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<boolean> {
  try {
    const text = await extractTextFromPdf(pdfPath, execFile);

    // 移除空白字元後計算有效字元數
    const cleanText = text.replace(/\s+/g, "");
    const charCount = cleanText.length;

    console.log(`[PDF-OCR] Extracted ${charCount} characters from PDF`);

    // 如果字元數低於閾值，視為掃描版
    const isScanned = charCount < SCANNED_PDF_TEXT_THRESHOLD;

    if (isScanned) {
      console.log(
        `[PDF-OCR] ⚠️ Detected scanned PDF (chars: ${charCount} < ${SCANNED_PDF_TEXT_THRESHOLD})`,
      );
    } else {
      console.log(`[PDF-OCR] ✅ PDF has text layer (chars: ${charCount})`);
    }

    return isScanned;
  } catch (error) {
    console.warn(`[PDF-OCR] Detection failed, assuming scanned: ${error}`);
    return true; // 偵測失敗時，保守起見視為掃描版
  }
}

/**
 * 使用 ocrmypdf 對 PDF 進行 OCR 處理
 *
 * @param inputPath 輸入 PDF 路徑
 * @param outputPath 輸出 PDF 路徑（可搜尋）
 * @param lang OCR 語言（預設：eng+chi_tra+chi_sim+jpn）
 * @param execFile execFile 函數
 * @returns 處理後的 PDF 路徑
 */
export function runOcrMyPdf(
  inputPath: string,
  outputPath: string,
  lang: string = DEFAULT_OCR_LANG,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // ocrmypdf 參數：
    // -l <lang>: OCR 語言（可用 + 連接多語言）
    // --skip-text: 跳過已有文字的頁面（避免重複 OCR）
    // --optimize 1: 輕度優化，平衡速度和品質
    // --deskew: 自動校正傾斜
    // --clean: 清理背景雜訊
    // --force-ocr: 強制對所有頁面進行 OCR（即使有文字層）

    const args = ["-l", lang, "--skip-text", "--optimize", "1", "--deskew", inputPath, outputPath];

    console.log(`[PDF-OCR] Running: ocrmypdf ${args.join(" ")}`);

    execFile("ocrmypdf", args, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        // 檢查是否是「PDF 已經有文字」的警告
        if (stderr && stderr.includes("page already has text")) {
          console.log(`[PDF-OCR] PDF already has text layer, using original`);
          resolve(inputPath);
          return;
        }

        reject(new Error(`ocrmypdf error: ${error}\nstderr: ${stderr}`));
        return;
      }

      if (stdout) {
        console.log(`[PDF-OCR] stdout: ${stdout}`);
      }

      if (stderr) {
        // ocrmypdf 的進度資訊會輸出到 stderr
        console.log(`[PDF-OCR] stderr: ${stderr}`);
      }

      if (!existsSync(outputPath)) {
        reject(new Error(`OCR output file not found: ${outputPath}`));
        return;
      }

      console.log(`[PDF-OCR] ✅ OCR completed: ${outputPath}`);
      resolve(outputPath);
    });
  });
}

/**
 * 自動偵測並處理掃描版 PDF
 *
 * 如果 PDF 是掃描版（無文字層），自動執行 OCR
 * 如果 PDF 已有文字層，直接返回原始路徑
 *
 * @param inputPath 輸入 PDF 路徑
 * @param execFile execFile 函數
 * @returns 處理後的 PDF 路徑（可能是原始路徑或 OCR 後的新檔案）
 */
export async function ensureSearchablePdf(
  inputPath: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<{ path: string; wasOcred: boolean; tempFile?: string }> {
  // 1. 偵測是否為掃描版
  const scanned = await isScannedPdf(inputPath, execFile);

  if (!scanned) {
    // PDF 已有文字層，直接使用
    return { path: inputPath, wasOcred: false };
  }

  // 2. 建立 OCR 輸出路徑
  const dir = dirname(inputPath);
  const name = basename(inputPath, ".pdf");
  const ocrOutputPath = join(dir, `${name}_ocr_${Date.now()}.pdf`);

  // 3. 執行 OCR
  console.log(`[PDF-OCR] Starting OCR for scanned PDF...`);
  await runOcrMyPdf(inputPath, ocrOutputPath, DEFAULT_OCR_LANG, execFile);

  return {
    path: ocrOutputPath,
    wasOcred: true,
    tempFile: ocrOutputPath, // 呼叫者需要在完成後清理此暫存檔
  };
}

/**
 * 清理 OCR 產生的暫存檔案
 *
 * @param tempFile 暫存檔案路徑
 */
export function cleanupOcrTempFile(tempFile: string | undefined): void {
  if (tempFile && existsSync(tempFile)) {
    try {
      unlinkSync(tempFile);
      console.log(`[PDF-OCR] Cleaned up temp file: ${tempFile}`);
    } catch (error) {
      console.warn(`[PDF-OCR] Failed to cleanup temp file: ${error}`);
    }
  }
}
