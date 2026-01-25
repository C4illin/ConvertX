import { execFile as execFileOriginal } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
  copyFileSync,
  statSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { ExecFileFn } from "./types";
import { getArchiveFileName } from "../transfer";
import { ensureSearchablePdf, cleanupOcrTempFile } from "../helpers/pdfOcr";

/**
 * BabelDOC Content Engine
 *
 * 用於翻譯 PDF 文件的引擎，基於 BabelDOC CLI 工具。
 * 與 PDFMathTranslate 類似，但使用 babeldoc 命令進行翻譯。
 *
 * 所有輸出一律打包為 .tar 檔案，包含：
 *   - translated-<lang>.pdf（翻譯後的 PDF）
 *   - 其他 BabelDOC 產生的輔助檔案
 *
 * 必須在 Docker build 階段預先下載所需資源（--warmup），
 * 不允許在 runtime 隱式下載。
 */

// 支援的目標語言列表（與 PDFMathTranslate 保持一致）
const SUPPORTED_LANGUAGES = [
  "en", // English
  "zh", // Chinese (Simplified)
  "zh-TW", // Chinese (Traditional)
  "ja", // Japanese
  "ko", // Korean
  "de", // German
  "fr", // French
  "es", // Spanish
  "it", // Italian
  "pt", // Portuguese
  "ru", // Russian
  "ar", // Arabic
  "hi", // Hindi
  "vi", // Vietnamese
  "th", // Thai
] as const;

// 支援的輸出格式
const SUPPORTED_OUTPUT_FORMATS = ["pdf", "md", "html"] as const;
type OutputFormat = (typeof SUPPORTED_OUTPUT_FORMATS)[number];

// BabelDOC 快取路徑（Docker 環境中）
const BABELDOC_CACHE_PATH = process.env.BABELDOC_CACHE_PATH || "/root/.cache/babeldoc";

// 生成 from/to 格式映射
function generateLanguageMappings(): {
  from: Record<string, string[]>;
  to: Record<string, string[]>;
} {
  // BabelDOC 輸出格式：
  // - pdf-<lang>: 輸出 PDF
  // - md-<lang>: 輸出 Markdown
  // - html-<lang>: 輸出 HTML
  const outputFormats: string[] = [];

  for (const format of SUPPORTED_OUTPUT_FORMATS) {
    for (const lang of SUPPORTED_LANGUAGES) {
      outputFormats.push(`${format}-${lang}`);
    }
  }

  return {
    from: {
      document: ["pdf"],
    },
    to: {
      document: outputFormats,
    },
  };
}

export const properties = {
  ...generateLanguageMappings(),
  outputMode: "archive" as const,
};

/**
 * 從 convertTo 格式中提取目標語言和輸出格式
 * @param convertTo 格式如 "pdf-zh"、"md-en"、"html-ja"
 * @returns { lang: 目標語言代碼, format: 輸出格式 }
 */
function extractTargetInfo(convertTo: string): { lang: string; format: OutputFormat } {
  // convertTo 格式: <format>-<lang>
  // 例如: pdf-zh, md-en, html-ja
  const match = convertTo.match(/^(pdf|md|html)-(.+)$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(
      `Invalid convertTo format: ${convertTo}. Expected <format>-<lang> (format: pdf/md/html)`,
    );
  }
  return {
    format: match[1] as OutputFormat,
    lang: match[2],
  };
}

/**
 * 檢查 BabelDOC 資源是否已預先下載
 * @returns 資源是否存在
 */
function checkResourcesExist(): boolean {
  if (!existsSync(BABELDOC_CACHE_PATH)) {
    console.warn(`[BabelDOC] Cache directory not found: ${BABELDOC_CACHE_PATH}`);
    console.warn(`[BabelDOC] Resources should be pre-downloaded via --warmup during Docker build.`);
    return false;
  }
  return true;
}

/**
 * Helper function to create a .tar archive from a directory (no compression)
 *
 * ⚠️ 重要：僅使用 .tar 格式，禁止 .tar.gz / .tgz / .zip
 */
function createTarArchive(
  sourceDir: string,
  outputTar: string,
  execFile: ExecFileFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use tar command to create archive (without gzip compression)
    // tar -cf <output.tar> -C <sourceDir> .
    // 注意：使用 -cf 而非 -czf，避免 gzip 壓縮
    execFile("tar", ["-cf", outputTar, "-C", sourceDir, "."], (error, stdout, stderr) => {
      if (error) {
        reject(`tar error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(`tar stdout: ${stdout}`);
      }
      if (stderr) {
        console.error(`tar stderr: ${stderr}`);
      }
      resolve();
    });
  });
}

/**
 * Helper function to remove a directory recursively
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
 * BabelDOC 語言代碼轉換
 * BabelDOC 可能使用不同的語言代碼格式
 */
function toBabelDocLang(lang: string): string {
  // BabelDOC 語言代碼映射
  const langMap: Record<string, string> = {
    "zh-TW": "zh-Hant",
    zh: "zh-Hans",
  };
  return langMap[lang] || lang;
}

/**
 * 取得 BabelDOC 輸出格式對應的副檔名
 */
function getOutputExtension(format: OutputFormat): string {
  const extMap: Record<OutputFormat, string> = {
    pdf: "pdf",
    md: "md",
    html: "html",
  };
  return extMap[format];
}

/**
 * 執行 babeldoc 命令進行 PDF 翻譯
 *
 * @param inputPath 輸入 PDF 路徑
 * @param outputPath 輸出檔案路徑
 * @param targetLang 目標語言
 * @param outputFormat 輸出格式（pdf/md/html）
 * @param execFile 執行函數
 */
function runBabelDoc(
  inputPath: string,
  outputPath: string,
  targetLang: string,
  outputFormat: OutputFormat,
  execFile: ExecFileFn,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // babeldoc CLI 參數：
    // -i <input>: 輸入 PDF（縮寫不衝突，可以使用）
    // -o <output>: 輸出檔案（縮寫不衝突，可以使用）
    // --lang-out <lang>: 目標語言（注意：-l 是模糊的，會匹配 -li 和 -lo）
    // --output-format <format>: 輸出格式（pdf/md/html）
    // --service <service>: 翻譯服務（預設 google）

    const babelLang = toBabelDocLang(targetLang);
    const service = process.env.BABELDOC_SERVICE || "google";

    const args = [
      "-i",
      inputPath,
      "-o",
      outputPath,
      "--lang-out",
      babelLang,
      "--output-format",
      outputFormat,
      "--service",
      service,
    ];

    console.log(`[BabelDOC] Running: babeldoc ${args.join(" ")}`);

    execFile("babeldoc", args, (error, stdout, stderr) => {
      if (error) {
        reject(`babeldoc error: ${error}\nstderr: ${stderr}`);
        return;
      }

      if (stdout) {
        console.log(`[BabelDOC] stdout: ${stdout}`);
      }

      if (stderr) {
        console.log(`[BabelDOC] stderr: ${stderr}`);
      }

      // 檢查輸出檔案是否存在
      if (!existsSync(outputPath)) {
        reject(`BabelDOC output file not found: ${outputPath}`);
        return;
      }

      resolve(outputPath);
    });
  });
}

/**
 * 主要轉換函數
 *
 * @param filePath 輸入 PDF 檔案路徑
 * @param fileType 檔案類型（應為 "pdf"）
 * @param convertTo 目標格式（如 "pdf-babel-zh"、"md-babel-en"、"html-babel-ja"）
 * @param targetPath 輸出路徑
 * @param _options 額外選項
 * @param execFile 執行函數覆寫
 */
export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  _options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  let ocrTempFile: string | undefined;

  try {
    // 0. 自動偵測掃描版 PDF 並進行 OCR 處理
    console.log(`[BabelDOC] Checking if PDF needs OCR...`);
    const ocrResult = await ensureSearchablePdf(filePath, execFile);
    const inputPdf = ocrResult.path;
    ocrTempFile = ocrResult.tempFile;

    if (ocrResult.wasOcred) {
      console.log(`[BabelDOC] ✅ Scanned PDF detected and OCR'd automatically`);
    }

    // 1. 檢查資源（警告但不阻止）
    checkResourcesExist();

    // 2. 提取目標語言和輸出格式
    const { lang: targetLang, format: outputFormat } = extractTargetInfo(convertTo);
    const outputExt = getOutputExtension(outputFormat);
    console.log(`[BabelDOC] Translating to: ${targetLang}, format: ${outputFormat}`);

    // 3. 建立臨時輸出目錄
    const outputDir = dirname(targetPath);
    const inputFileName = basename(filePath, `.${fileType}`);
    const tempDir = join(outputDir, `${inputFileName}_babeldoc_${Date.now()}`);

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // 4. 建立封裝用目錄
    const archiveDir = join(tempDir, "archive");
    mkdirSync(archiveDir, { recursive: true });

    // 5. 設定 BabelDOC 輸出路徑（依輸出格式決定副檔名）
    const translatedFilePath = join(tempDir, `${inputFileName}-translated.${outputExt}`);

    // 6. 執行 babeldoc 翻譯（使用 OCR 處理後的 PDF）
    await runBabelDoc(inputPdf, translatedFilePath, targetLang, outputFormat, execFile);

    // 7. 複製翻譯後的檔案到封裝目錄
    const translatedDest = join(archiveDir, `translated-${targetLang}.${outputExt}`);
    copyFileSync(translatedFilePath, translatedDest);
    console.log(`[BabelDOC] Copied translated ${outputFormat.toUpperCase()} to archive`);

    // 8. 檢查是否有其他 BabelDOC 產生的輔助檔案
    const translatedBaseName = `${inputFileName}-translated.${outputExt}`;
    const tempFiles = readdirSync(tempDir);
    for (const file of tempFiles) {
      const fileTempPath = join(tempDir, file);
      // 跳過 archive 目錄和已處理的主檔案
      if (file === "archive" || file === translatedBaseName) {
        continue;
      }
      // 複製其他產生的檔案（如 debug 輸出、中間結果等）
      const destPath = join(archiveDir, file);
      if (existsSync(fileTempPath) && !existsSync(destPath)) {
        try {
          const stats = statSync(fileTempPath);
          if (stats.isFile()) {
            copyFileSync(fileTempPath, destPath);
            console.log(`[BabelDOC] Copied auxiliary file: ${file}`);
          }
        } catch {
          // 忽略複製失敗的輔助檔案
        }
      }
    }

    // 9. 建立 .tar 封裝
    const tarPath = getArchiveFileName(targetPath);
    const tarDir = dirname(tarPath);
    if (!existsSync(tarDir)) {
      mkdirSync(tarDir, { recursive: true });
    }

    await createTarArchive(archiveDir, tarPath, execFile);
    console.log(`[BabelDOC] Created archive: ${tarPath}`);

    // 10. 清理臨時目錄
    removeDir(tempDir);

    // 11. 清理 OCR 暫存檔案
    cleanupOcrTempFile(ocrTempFile);

    return "Done";
  } catch (error) {
    // 確保清理 OCR 暫存檔案
    cleanupOcrTempFile(ocrTempFile);
    throw new Error(`BabelDOC error: ${error}`);
  }
}
