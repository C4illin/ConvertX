import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync, copyFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import type { ExecFileFn } from "./types";

/**
 * PDF Packager Engine
 *
 * 針對輸入 PDF，依使用者選擇的單一 chip，產生對應的「最終輸出」並提供下載。
 *
 * 支援的 chip 類別：
 *   A) 圖片輸出（打包 .tar）: png-*, jpg-*, jpeg-*
 *   B) 圖片型 PDF: pdf-*
 *   C) PDF/A-1b: pdfa1b-*
 *   D) PDF/A-2b: pdfa2b-*
 *   E) 全部打包: all-*
 *
 * Chip 命名規則：
 *   - DPI: 150, 300, 600
 *   - 保護: p (可列印), np (不可列印)
 *   - 簽章: s (需要簽章)
 *   - PDF/A 來源: i (從圖片), o (從原始 PDF)
 */

// =============================================================================
// Chip 常數定義（手刻列出所有可選項目）
// =============================================================================

/**
 * 所有支援的 chips（完整清單，手刻列出）
 * ⚠️ 不要用迴圈動態生成，確保內容完全可控、可閱讀、可維護
 */
export const ALL_CHIPS = [
  // A) 圖片輸出（打包 .tar）
  "png-150",
  "png-300",
  "png-600",
  "jpg-150",
  "jpg-300",
  "jpg-600",
  "jpeg-150",
  "jpeg-300",
  "jpeg-600",

  // B) 圖片型 PDF
  "pdf-150",
  "pdf-300",
  "pdf-600",
  "pdf-150-p",
  "pdf-150-np",
  "pdf-300-p",
  "pdf-300-np",
  "pdf-600-p",
  "pdf-600-np",
  "pdf-150-s",
  "pdf-300-s",
  "pdf-600-s",
  "pdf-150-p-s",
  "pdf-150-np-s",
  "pdf-300-p-s",
  "pdf-300-np-s",
  "pdf-600-p-s",
  "pdf-600-np-s",

  // C) PDF/A-1b（來源 i）
  "pdfa1b-i-150",
  "pdfa1b-i-300",
  "pdfa1b-i-600",
  "pdfa1b-i-150-p",
  "pdfa1b-i-150-np",
  "pdfa1b-i-300-p",
  "pdfa1b-i-300-np",
  "pdfa1b-i-600-p",
  "pdfa1b-i-600-np",
  "pdfa1b-i-150-s",
  "pdfa1b-i-300-s",
  "pdfa1b-i-600-s",
  "pdfa1b-i-150-p-s",
  "pdfa1b-i-150-np-s",
  "pdfa1b-i-300-p-s",
  "pdfa1b-i-300-np-s",
  "pdfa1b-i-600-p-s",
  "pdfa1b-i-600-np-s",

  // C) PDF/A-1b（來源 o）
  "pdfa1b-o-150",
  "pdfa1b-o-300",
  "pdfa1b-o-600",
  "pdfa1b-o-150-p",
  "pdfa1b-o-150-np",
  "pdfa1b-o-300-p",
  "pdfa1b-o-300-np",
  "pdfa1b-o-600-p",
  "pdfa1b-o-600-np",
  "pdfa1b-o-150-s",
  "pdfa1b-o-300-s",
  "pdfa1b-o-600-s",
  "pdfa1b-o-150-p-s",
  "pdfa1b-o-150-np-s",
  "pdfa1b-o-300-p-s",
  "pdfa1b-o-300-np-s",
  "pdfa1b-o-600-p-s",
  "pdfa1b-o-600-np-s",

  // D) PDF/A-2b（來源 i）
  "pdfa2b-i-150",
  "pdfa2b-i-300",
  "pdfa2b-i-600",
  "pdfa2b-i-150-p",
  "pdfa2b-i-150-np",
  "pdfa2b-i-300-p",
  "pdfa2b-i-300-np",
  "pdfa2b-i-600-p",
  "pdfa2b-i-600-np",
  "pdfa2b-i-150-s",
  "pdfa2b-i-300-s",
  "pdfa2b-i-600-s",
  "pdfa2b-i-150-p-s",
  "pdfa2b-i-150-np-s",
  "pdfa2b-i-300-p-s",
  "pdfa2b-i-300-np-s",
  "pdfa2b-i-600-p-s",
  "pdfa2b-i-600-np-s",

  // D) PDF/A-2b（來源 o）
  "pdfa2b-o-150",
  "pdfa2b-o-300",
  "pdfa2b-o-600",
  "pdfa2b-o-150-p",
  "pdfa2b-o-150-np",
  "pdfa2b-o-300-p",
  "pdfa2b-o-300-np",
  "pdfa2b-o-600-p",
  "pdfa2b-o-600-np",
  "pdfa2b-o-150-s",
  "pdfa2b-o-300-s",
  "pdfa2b-o-600-s",
  "pdfa2b-o-150-p-s",
  "pdfa2b-o-150-np-s",
  "pdfa2b-o-300-p-s",
  "pdfa2b-o-300-np-s",
  "pdfa2b-o-600-p-s",
  "pdfa2b-o-600-np-s",

  // E) 全部打包
  "all-150",
  "all-300",
  "all-600",
] as const;

// =============================================================================
// 引擎屬性定義
// =============================================================================

export const properties = {
  from: {
    document: ["pdf"],
  },
  to: {
    document: [...ALL_CHIPS] as string[],
  },
  // 某些 chip 輸出 .tar（images, all-*），其他輸出 .pdf
  // PDF Packager 不使用 outputMode，而是根據 chip 動態決定輸出類型
};

// =============================================================================
// Chip 解析器
// =============================================================================

/**
 * 解析後的 Chip 結構
 */
export interface ParsedChip {
  kind: "images" | "pdf_image" | "pdfa" | "all";
  dpi: 150 | 300 | 600;

  // images only
  imageFormat?: "png" | "jpg" | "jpeg" | undefined;

  // pdfa only
  pdfaLevel?: "1b" | "2b" | undefined;
  pdfaSource?: "i" | "o" | undefined;

  // for pdf outputs that can be protected
  protect?: "p" | "np" | undefined; // print allowed / no print
  sign?: boolean | undefined; // -s

  // 原始 chip 名稱
  rawChip: string;
}

/**
 * 解析 chip 字串
 * @param chip chip 名稱
 * @returns 解析後的結構，或 null 表示無效
 */
export function parseChip(chip: string): ParsedChip | null {
  // all-<dpi>
  const allMatch = chip.match(/^all-(150|300|600)$/);
  if (allMatch && allMatch[1]) {
    return {
      kind: "all",
      dpi: Number.parseInt(allMatch[1], 10) as 150 | 300 | 600,
      rawChip: chip,
    };
  }

  // <img>-<dpi> (png, jpg, jpeg)
  const imgMatch = chip.match(/^(png|jpg|jpeg)-(150|300|600)$/);
  if (imgMatch && imgMatch[1] && imgMatch[2]) {
    return {
      kind: "images",
      dpi: Number.parseInt(imgMatch[2], 10) as 150 | 300 | 600,
      imageFormat: imgMatch[1] as "png" | "jpg" | "jpeg",
      rawChip: chip,
    };
  }

  // pdf-<dpi>[-<protect>][-s]
  const pdfMatch = chip.match(/^pdf-(150|300|600)(?:-(p|np))?(?:-(s))?$/);
  if (pdfMatch && pdfMatch[1]) {
    return {
      kind: "pdf_image",
      dpi: Number.parseInt(pdfMatch[1], 10) as 150 | 300 | 600,
      protect: (pdfMatch[2] as "p" | "np" | undefined) ?? undefined,
      sign: pdfMatch[3] === "s",
      rawChip: chip,
    };
  }

  // pdfa<level>-<src>-<dpi>[-<protect>][-s]
  const pdfaMatch = chip.match(/^pdfa(1b|2b)-(i|o)-(150|300|600)(?:-(p|np))?(?:-(s))?$/);
  if (pdfaMatch && pdfaMatch[1] && pdfaMatch[2] && pdfaMatch[3]) {
    return {
      kind: "pdfa",
      dpi: Number.parseInt(pdfaMatch[3], 10) as 150 | 300 | 600,
      pdfaLevel: pdfaMatch[1] as "1b" | "2b",
      pdfaSource: pdfaMatch[2] as "i" | "o",
      protect: (pdfaMatch[4] as "p" | "np" | undefined) ?? undefined,
      sign: pdfaMatch[5] === "s",
      rawChip: chip,
    };
  }

  return null;
}

/**
 * 檢查輸出是否為 archive 格式
 */
export function isArchiveOutput(chip: string): boolean {
  const parsed = parseChip(chip);
  if (!parsed) return false;
  return parsed.kind === "images" || parsed.kind === "all";
}

/**
 * 取得輸出檔名
 */
export function getOutputFileName(chip: string): string {
  if (isArchiveOutput(chip)) {
    return `pack_${chip}.tar`;
  }
  return `pack_${chip}.pdf`;
}

// =============================================================================
// 工具函式
// =============================================================================

/**
 * 遞迴刪除目錄
 */
function removeDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isDirectory()) {
        removeDir(filePath);
      } else {
        unlinkSync(filePath);
      }
    }
    rmdirSync(dirPath);
  }
}

/**
 * 清理目錄內所有檔案
 */
function cleanDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath);
    for (const file of files) {
      const filePath = join(dirPath, file);
      unlinkSync(filePath);
    }
  }
}

/**
 * 執行命令並返回 Promise
 */
function execCommand(
  cmd: string,
  args: string[],
  execFile: ExecFileFn,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} error: ${error.message}\nstderr: ${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// =============================================================================
// Pipeline 處理函式
// =============================================================================

/**
 * 使用 pdftoppm 將 PDF 轉換為圖片
 * @param inputPdf 輸入 PDF 路徑
 * @param outputDir 輸出目錄
 * @param dpi DPI 值
 * @param format 圖片格式 (png, jpeg)
 * @param execFile execFile 函數
 * @returns 產生的圖片檔案路徑列表
 */
async function pdfToImages(
  inputPdf: string,
  outputDir: string,
  dpi: number,
  format: "png" | "jpeg",
  execFile: ExecFileFn,
): Promise<string[]> {
  console.log(`[PDFPackager] 📸 執行 pdftoppm (DPI: ${dpi}, 格式: ${format})`);

  const outputPrefix = join(outputDir, "page");

  // pdftoppm -r <dpi> -<format> <input.pdf> <output_prefix>
  const args = ["-r", String(dpi)];
  if (format === "png") {
    args.push("-png");
  } else {
    args.push("-jpeg");
  }
  args.push(inputPdf, outputPrefix);

  await execCommand("pdftoppm", args, execFile);

  // 取得產生的圖片檔案
  const files = readdirSync(outputDir)
    .filter((f) => f.startsWith("page-") && (f.endsWith(".png") || f.endsWith(".jpg")))
    .sort()
    .map((f) => join(outputDir, f));

  console.log(`[PDFPackager]    ✅ 產生 ${files.length} 張圖片`);
  return files;
}

/**
 * 使用 img2pdf 將圖片合成為 PDF
 * @param imageFiles 圖片檔案路徑列表
 * @param outputPdf 輸出 PDF 路徑
 * @param execFile execFile 函數
 */
async function imagesToPdf(
  imageFiles: string[],
  outputPdf: string,
  execFile: ExecFileFn,
): Promise<void> {
  console.log(`[PDFPackager] 📄 執行 img2pdf (${imageFiles.length} 張圖片)`);

  // img2pdf <images...> -o <output.pdf>
  const args = [...imageFiles, "-o", outputPdf];

  await execCommand("img2pdf", args, execFile);
  console.log(`[PDFPackager]    ✅ 產生圖片型 PDF`);
}

/**
 * 使用 Ghostscript 轉換為 PDF/A
 * @param inputPdf 輸入 PDF 路徑
 * @param outputPdf 輸出 PDF 路徑
 * @param level PDF/A 級別 (1b, 2b)
 * @param execFile execFile 函數
 */
async function convertToPdfA(
  inputPdf: string,
  outputPdf: string,
  level: "1b" | "2b",
  execFile: ExecFileFn,
): Promise<void> {
  console.log(`[PDFPackager] 📋 執行 Ghostscript (PDF/A-${level})`);

  // 根據 level 選擇 PDF/A 標準
  const pdfaProfile = level === "1b" ? "1" : "2";

  // gs -dPDFA=<level> -dBATCH -dNOPAUSE -sColorConversionStrategy=UseDeviceIndependentColor
  //    -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile=<output> <input>
  const args = [
    `-dPDFA=${pdfaProfile}`,
    "-dBATCH",
    "-dNOPAUSE",
    "-dQUIET",
    "-sColorConversionStrategy=UseDeviceIndependentColor",
    "-sDEVICE=pdfwrite",
    "-dPDFACompatibilityPolicy=1",
    `-sOutputFile=${outputPdf}`,
    inputPdf,
  ];

  await execCommand("gs", args, execFile);
  console.log(`[PDFPackager]    ✅ 產生 PDF/A-${level}`);
}

/**
 * 使用 qpdf 設定 PDF 權限保護
 * @param inputPdf 輸入 PDF 路徑
 * @param outputPdf 輸出 PDF 路徑
 * @param allowPrint 是否允許列印
 * @param execFile execFile 函數
 */
async function protectPdf(
  inputPdf: string,
  outputPdf: string,
  allowPrint: boolean,
  execFile: ExecFileFn,
): Promise<void> {
  console.log(`[PDFPackager] 🔒 執行 qpdf (允許列印: ${allowPrint})`);

  // qpdf --encrypt "" "" 256 --modify=none [--print=none] -- <input> <output>
  const args = ["--encrypt", "", "", "256", "--modify=none"];

  if (!allowPrint) {
    args.push("--print=none");
  }

  args.push("--", inputPdf, outputPdf);

  await execCommand("qpdf", args, execFile);
  console.log(`[PDFPackager]    ✅ PDF 權限保護已設定`);
}

/**
 * 使用系統內建的 Python endesive 庫進行 PDF 數位簽章
 *
 * 預設配置（開箱即用）：
 *   - PDF_SIGN_P12_PATH: /app/certs/default.p12（內建自簽憑證）
 *   - PDF_SIGN_P12_PASSWORD: （空密碼）
 *
 * 自訂配置（使用自己的憑證）：
 *   - PDF_SIGN_P12_PATH: PKCS12 憑證檔案路徑
 *   - PDF_SIGN_P12_PASSWORD: PKCS12 憑證密碼（選用）
 *   - PDF_SIGN_REASON: 簽章原因（選用）
 *   - PDF_SIGN_LOCATION: 簽章地點（選用）
 *   - PDF_SIGN_CONTACT: 聯絡資訊（選用）
 *
 * @param inputPdf 輸入 PDF 路徑
 * @param outputPdf 輸出 PDF 路徑
 * @param execFile execFile 函數
 */
async function signPdf(inputPdf: string, outputPdf: string, execFile: ExecFileFn): Promise<void> {
  console.log(`[PDFPackager] ✍️ 執行 PDF 數位簽章`);

  // 使用預設憑證或自訂憑證
  const p12Path = process.env.PDF_SIGN_P12_PATH || "/app/certs/default.p12";

  // 檢查憑證是否存在（僅在非測試環境檢查）
  if (!existsSync(p12Path) && process.env.NODE_ENV !== "test") {
    throw new Error(
      "SIGNING_NOT_CONFIGURED: 數位簽章憑證不存在。\n" +
        `憑證路徑: ${p12Path}\n` +
        "請確認 Docker 環境已正確安裝，或指定自訂憑證路徑：\n" +
        "  PDF_SIGN_P12_PATH=/path/to/your/certificate.p12",
    );
  }

  // 使用 Python 腳本進行簽章
  // 腳本路徑：/app/scripts/pdf_sign.py（Docker 環境）或相對於專案根目錄
  const scriptPath = process.env.PDF_SIGN_SCRIPT_PATH || "/app/scripts/pdf_sign.py";

  try {
    await execCommand("python3", [scriptPath, inputPdf, outputPdf], execFile);
    console.log(`[PDFPackager]    ✅ PDF 數位簽章完成`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 檢查是否為憑證未配置錯誤
    if (errorMessage.includes("PDF_SIGN_P12_PATH") || errorMessage.includes("未設定")) {
      throw new Error(
        "SIGNING_NOT_CONFIGURED: 數位簽章功能需要配置 PKCS12 憑證。\n" +
          "請設定以下環境變數：\n" +
          "  PDF_SIGN_P12_PATH=/path/to/certificate.p12\n" +
          "  PDF_SIGN_P12_PASSWORD=your_password (選用)",
      );
    }

    // 檢查是否為憑證讀取錯誤
    if (errorMessage.includes("密碼錯誤") || errorMessage.includes("格式不正確")) {
      throw new Error(`SIGNING_CERTIFICATE_ERROR: 無法讀取 PKCS12 憑證。${errorMessage}`);
    }

    throw new Error(`SIGNING_ERROR: PDF 簽章失敗。${errorMessage}`);
  }
}

/**
 * 建立 .tar 打包
 * @param sourceDir 來源目錄
 * @param outputTar 輸出 tar 檔案路徑
 * @param execFile execFile 函數
 */
async function createTarArchive(
  sourceDir: string,
  outputTar: string,
  execFile: ExecFileFn,
): Promise<void> {
  console.log(`[PDFPackager] 📦 建立 tar 打包`);

  // tar -cf <output.tar> -C <sourceDir> .
  await execCommand("tar", ["-cf", outputTar, "-C", sourceDir, "."], execFile);

  console.log(`[PDFPackager]    ✅ tar 打包完成`);
}

// =============================================================================
// 主要 Pipeline 處理器
// =============================================================================

/**
 * 處理圖片輸出 pipeline (png-*, jpg-*, jpeg-*)
 */
async function processImagesPipeline(
  inputPdf: string,
  workDir: string,
  outDir: string,
  parsed: ParsedChip,
  execFile: ExecFileFn,
): Promise<string> {
  const imgsDir = join(workDir, "imgs");
  mkdirSync(imgsDir, { recursive: true });

  // Step 1: pdftoppm 產生圖片
  const format = parsed.imageFormat === "png" ? "png" : "jpeg";
  const imageFiles = await pdfToImages(inputPdf, imgsDir, parsed.dpi, format, execFile);

  // 如果是 jpg，需要重新命名副檔名
  if (parsed.imageFormat === "jpg") {
    for (const imgFile of imageFiles) {
      if (imgFile.endsWith(".jpg")) continue;
      const newPath = imgFile.replace(/\.jpeg$/, ".jpg");
      copyFileSync(imgFile, newPath);
      unlinkSync(imgFile);
    }
  }

  // Step 2: tar 打包
  const outputTar = join(outDir, getOutputFileName(parsed.rawChip));
  await createTarArchive(imgsDir, outputTar, execFile);

  // Step 3: 清理暫存
  cleanDir(imgsDir);
  removeDir(imgsDir);

  return outputTar;
}

/**
 * 處理圖片型 PDF pipeline (pdf-*)
 */
async function processPdfImagePipeline(
  inputPdf: string,
  workDir: string,
  outDir: string,
  parsed: ParsedChip,
  execFile: ExecFileFn,
): Promise<string> {
  const imgsDir = join(workDir, "imgs");
  const pdfDir = join(workDir, "pdf");
  mkdirSync(imgsDir, { recursive: true });
  mkdirSync(pdfDir, { recursive: true });

  let currentPdf: string;

  // Step 1: pdftoppm 產生圖片
  const imageFiles = await pdfToImages(inputPdf, imgsDir, parsed.dpi, "png", execFile);

  // Step 2: img2pdf 合成 PDF
  currentPdf = join(pdfDir, "image_based.pdf");
  await imagesToPdf(imageFiles, currentPdf, execFile);

  // Step 3: (可選) 權限保護
  if (parsed.protect) {
    const protectedPdf = join(pdfDir, "protected.pdf");
    await protectPdf(currentPdf, protectedPdf, parsed.protect === "p", execFile);
    currentPdf = protectedPdf;
  }

  // Step 4: (可選) 簽章
  if (parsed.sign) {
    const signedPdf = join(pdfDir, "signed.pdf");
    await signPdf(currentPdf, signedPdf, execFile);
    currentPdf = signedPdf;
  }

  // Step 5: 輸出
  const outputPdf = join(outDir, getOutputFileName(parsed.rawChip));
  copyFileSync(currentPdf, outputPdf);

  // Step 6: 清理
  cleanDir(imgsDir);
  removeDir(imgsDir);
  cleanDir(pdfDir);
  removeDir(pdfDir);

  return outputPdf;
}

/**
 * 處理 PDF/A pipeline (pdfa1b-*, pdfa2b-*)
 */
async function processPdfAPipeline(
  inputPdf: string,
  workDir: string,
  outDir: string,
  parsed: ParsedChip,
  execFile: ExecFileFn,
): Promise<string> {
  const imgsDir = join(workDir, "imgs");
  const pdfDir = join(workDir, "pdf");
  mkdirSync(pdfDir, { recursive: true });

  let currentPdf: string;

  if (parsed.pdfaSource === "i") {
    // 從圖片產生
    mkdirSync(imgsDir, { recursive: true });

    // Step 1: pdftoppm 產生圖片
    const imageFiles = await pdfToImages(inputPdf, imgsDir, parsed.dpi, "png", execFile);

    // Step 2: img2pdf 合成 PDF
    const imagePdf = join(pdfDir, "image_based.pdf");
    await imagesToPdf(imageFiles, imagePdf, execFile);

    // Step 3: 轉換為 PDF/A
    currentPdf = join(pdfDir, "pdfa.pdf");
    await convertToPdfA(imagePdf, currentPdf, parsed.pdfaLevel!, execFile);

    // 清理圖片暫存
    cleanDir(imgsDir);
    removeDir(imgsDir);
  } else {
    // 從原始 PDF 直接轉換
    // Step 1: 轉換為 PDF/A
    currentPdf = join(pdfDir, "pdfa.pdf");
    await convertToPdfA(inputPdf, currentPdf, parsed.pdfaLevel!, execFile);
  }

  // Step 4: (可選) 權限保護
  if (parsed.protect) {
    const protectedPdf = join(pdfDir, "protected.pdf");
    await protectPdf(currentPdf, protectedPdf, parsed.protect === "p", execFile);
    currentPdf = protectedPdf;
  }

  // Step 5: (可選) 簽章
  if (parsed.sign) {
    const signedPdf = join(pdfDir, "signed.pdf");
    await signPdf(currentPdf, signedPdf, execFile);
    currentPdf = signedPdf;
  }

  // Step 6: 輸出
  const outputPdf = join(outDir, getOutputFileName(parsed.rawChip));
  copyFileSync(currentPdf, outputPdf);

  // Step 7: 清理
  cleanDir(pdfDir);
  removeDir(pdfDir);

  return outputPdf;
}

/**
 * all-<dpi> 包含的子 chips 定義
 * 固定集合，不包含簽章變體（避免輸出過多）
 */
function getAllSubChips(dpi: 150 | 300 | 600): string[] {
  return [
    // 圖片
    `png-${dpi}`,
    `jpg-${dpi}`,
    `jpeg-${dpi}`,
    // 圖片型 PDF
    `pdf-${dpi}`,
    `pdf-${dpi}-p`,
    `pdf-${dpi}-np`,
    // PDF/A
    `pdfa1b-i-${dpi}`,
    `pdfa1b-o-${dpi}`,
    `pdfa2b-i-${dpi}`,
    `pdfa2b-o-${dpi}`,
  ];
}

/**
 * 處理 all-* pipeline
 */
async function processAllPipeline(
  inputPdf: string,
  workDir: string,
  outDir: string,
  parsed: ParsedChip,
  execFile: ExecFileFn,
): Promise<string> {
  const allDir = join(outDir, "all");
  mkdirSync(allDir, { recursive: true });

  const subChips = getAllSubChips(parsed.dpi);

  console.log(`[PDFPackager] 📦 all-${parsed.dpi}: 處理 ${subChips.length} 個子項目`);

  for (const subChip of subChips) {
    const subParsed = parseChip(subChip);
    if (!subParsed) continue;

    console.log(`[PDFPackager]    ▶ 處理子項目: ${subChip}`);

    try {
      let outputFile: string;

      switch (subParsed.kind) {
        case "images":
          outputFile = await processImagesPipeline(inputPdf, workDir, allDir, subParsed, execFile);
          break;
        case "pdf_image":
          outputFile = await processPdfImagePipeline(
            inputPdf,
            workDir,
            allDir,
            subParsed,
            execFile,
          );
          break;
        case "pdfa":
          outputFile = await processPdfAPipeline(inputPdf, workDir, allDir, subParsed, execFile);
          break;
        default:
          continue;
      }

      console.log(`[PDFPackager]    ✅ ${subChip} 完成: ${basename(outputFile)}`);
    } catch (error) {
      console.error(`[PDFPackager]    ❌ ${subChip} 失敗: ${error}`);
      // 繼續處理其他子項目
    }
  }

  // 打包 all 目錄
  const outputTar = join(outDir, getOutputFileName(parsed.rawChip));
  await createTarArchive(allDir, outputTar, execFile);

  // 清理
  removeDir(allDir);

  return outputTar;
}

// =============================================================================
// 主要轉換函數
// =============================================================================

/**
 * PDF Packager 主要轉換函數
 *
 * @param filePath 輸入 PDF 檔案路徑
 * @param fileType 檔案類型（應為 "pdf"）
 * @param convertTo 目標格式（chip 名稱）
 * @param targetPath 輸出路徑基底
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
  console.log(`[PDFPackager] ╔════════════════════════════════════════╗`);
  console.log(`[PDFPackager] ║     PDF Packager - 多功能 PDF 處理     ║`);
  console.log(`[PDFPackager] ╚════════════════════════════════════════╝`);
  console.log(``);

  // Step 1: 解析 chip
  console.log(`[PDFPackager] 🔧 解析 chip: ${convertTo}`);
  const parsed = parseChip(convertTo);

  if (!parsed) {
    throw new Error(`INVALID_CHIP: 無效的 chip 名稱: ${convertTo}`);
  }

  console.log(`[PDFPackager]    類型: ${parsed.kind}`);
  console.log(`[PDFPackager]    DPI: ${parsed.dpi}`);
  if (parsed.imageFormat) console.log(`[PDFPackager]    圖片格式: ${parsed.imageFormat}`);
  if (parsed.pdfaLevel) console.log(`[PDFPackager]    PDF/A 級別: ${parsed.pdfaLevel}`);
  if (parsed.pdfaSource) console.log(`[PDFPackager]    PDF/A 來源: ${parsed.pdfaSource}`);
  if (parsed.protect) console.log(`[PDFPackager]    權限保護: ${parsed.protect}`);
  if (parsed.sign) console.log(`[PDFPackager]    簽章: ${parsed.sign}`);

  // Step 2: 準備工作目錄
  const outputDir = dirname(targetPath);
  const inputFileName = basename(filePath, `.${fileType}`);
  const workDir = join(outputDir, `_pdfpackager_work_${inputFileName}_${Date.now()}`);
  const outDir = outputDir;

  mkdirSync(workDir, { recursive: true });

  console.log(`[PDFPackager] 📁 工作目錄: ${workDir}`);

  try {
    let outputFile: string;

    // Step 3: 根據 chip 類型執行對應 pipeline
    switch (parsed.kind) {
      case "images":
        outputFile = await processImagesPipeline(filePath, workDir, outDir, parsed, execFile);
        break;
      case "pdf_image":
        outputFile = await processPdfImagePipeline(filePath, workDir, outDir, parsed, execFile);
        break;
      case "pdfa":
        outputFile = await processPdfAPipeline(filePath, workDir, outDir, parsed, execFile);
        break;
      case "all":
        outputFile = await processAllPipeline(filePath, workDir, outDir, parsed, execFile);
        break;
      default:
        throw new Error(`INVALID_CHIP_KIND: 未知的 chip 類型`);
    }

    console.log(``);
    console.log(`[PDFPackager] ╔════════════════════════════════════════╗`);
    console.log(`[PDFPackager] ║     ✅ PDF Packager 處理完成！          ║`);
    console.log(`[PDFPackager] ╚════════════════════════════════════════╝`);
    console.log(`[PDFPackager]    輸出: ${basename(outputFile)}`);
    console.log(``);

    return "Done";
  } catch (error) {
    console.log(``);
    console.log(`[PDFPackager] ╔════════════════════════════════════════╗`);
    console.log(`[PDFPackager] ║     ❌ PDF Packager 處理失敗            ║`);
    console.log(`[PDFPackager] ╚════════════════════════════════════════╝`);
    console.log(`[PDFPackager] 錯誤: ${error}`);
    console.log(``);
    throw error;
  } finally {
    // 清理工作目錄
    try {
      removeDir(workDir);
      console.log(`[PDFPackager] 🧹 已清理工作目錄`);
    } catch (e) {
      console.warn(`[PDFPackager] ⚠️ 清理工作目錄失敗: ${e}`);
    }
  }
}
