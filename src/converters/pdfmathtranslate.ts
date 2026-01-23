import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync, copyFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { getArchiveFileName } from "../transfer";
import type { ExecFileFn } from "./types";

// 翻譯服務優先順序（自動 fallback）
const TRANSLATION_SERVICES = ["google", "bing"] as const;
type TranslationService = (typeof TRANSLATION_SERVICES)[number];

/**
 * PDFMathTranslate Content Engine
 *
 * 用於翻譯 PDF 文件同時保留數學公式的引擎。
 *
 * 使用 pdf2zh CLI 工具進行翻譯，支援多種目標語言。
 * 所有輸出一律打包為 .tar 檔案，包含：
 *   - original.pdf（原始 PDF）
 *   - translated-<lang>.pdf（翻譯後的 PDF）
 *
 * 模型路徑說明：
 *   - pdf2zh 使用 babeldoc.assets 內部載入 ONNX 模型
 *   - 模型預先下載到 /root/.cache/babeldoc/models/ 目錄
 *   - Runtime 不會再下載任何模型（由 Docker build 預下載）
 */

// 支援的目標語言列表
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

// 模型路徑（BabelDOC cache 目錄，由 pdf2zh 內部使用）
// 注意：pdf2zh 會自動從 babeldoc.assets 載入模型，此路徑僅供參考
const BABELDOC_CACHE_PATH = process.env.BABELDOC_CACHE_PATH || "/root/.cache/babeldoc";
const MODELS_PATH = `${BABELDOC_CACHE_PATH}/models`;

// 生成 from/to 格式映射
function generateLanguageMappings(): {
  from: Record<string, string[]>;
  to: Record<string, string[]>;
} {
  const outputFormats = SUPPORTED_LANGUAGES.map((lang) => `pdf-${lang}`);

  return {
    from: {
      document: ["pdf"],
    },
    to: {
      document: outputFormats as unknown as string[],
    },
  };
}

export const properties = {
  ...generateLanguageMappings(),
  outputMode: "archive" as const,
};

/**
 * 從 convertTo 格式中提取目標語言
 * @param convertTo 格式如 "pdf-zh" 或 "pdf-en"
 * @returns 目標語言代碼
 */
function extractTargetLanguage(convertTo: string): string {
  // convertTo 格式: pdf-<lang>
  const match = convertTo.match(/^pdf-(.+)$/);
  if (!match || !match[1]) {
    throw new Error(`Invalid convertTo format: ${convertTo}. Expected pdf-<lang>`);
  }
  return match[1];
}

/**
 * 標準化語言代碼為 pdf2zh 支援的格式
 * pdf2zh 使用 Google Translate 的語言代碼
 * @param lang 輸入語言代碼
 * @returns 標準化後的語言代碼
 */
function normalizeLanguageCode(lang: string): string {
  // pdf2zh / Google Translate 語言代碼映射
  const langMap: Record<string, string> = {
    // 繁體中文：pdf2zh 使用 "zh-TW" 或 "zh-Hant"
    "zh-tw": "zh-TW",
    "zh-hant": "zh-TW",
    zht: "zh-TW",
    // 簡體中文
    "zh-cn": "zh-CN",
    "zh-hans": "zh-CN",
    zhs: "zh-CN",
    zh: "zh-CN",
    // 其他語言保持原樣
  };

  const lowerLang = lang.toLowerCase();
  return langMap[lowerLang] || lang;
}

/**
 * 檢查模型是否已預先下載
 * @returns 模型是否存在
 */
function checkModelsExist(): boolean {
  // 檢查 BabelDOC ONNX 模型目錄是否存在
  if (!existsSync(MODELS_PATH)) {
    console.warn(`[PDFMathTranslate] BabelDOC models directory not found: ${MODELS_PATH}`);
    console.warn(`[PDFMathTranslate] Models should be pre-downloaded during Docker build.`);
    return false;
  }

  // 檢查特定的 ONNX 模型檔案
  const onnxModelPath = join(MODELS_PATH, "doclayout_yolo_docstructbench_imgsz1024.onnx");
  if (!existsSync(onnxModelPath)) {
    console.warn(`[PDFMathTranslate] ONNX model not found: ${onnxModelPath}`);
    console.warn(`[PDFMathTranslate] Model should be pre-downloaded during Docker build.`);
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
  execFile: ExecFileFn = execFileOriginal,
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
 * 執行 pdf2zh 命令進行 PDF 翻譯（單一服務）
 *
 * @param inputPath 輸入 PDF 路徑
 * @param outputDir 輸出目錄
 * @param targetLang 目標語言
 * @param service 翻譯服務（google, bing）
 * @param execFile execFile 函數（用於測試注入）
 */
function runPdf2zhWithService(
  inputPath: string,
  outputDir: string,
  targetLang: string,
  service: TranslationService,
  execFile: ExecFileFn = execFileOriginal,
): Promise<{ monoPath: string; dualPath: string }> {
  return new Promise((resolve, reject) => {
    // pdf2zh CLI 參數：
    // -lo <lang>: 目標語言
    // -o <dir>: 輸出目錄
    // -s <service>: 翻譯服務（google, bing, deepl, ollama 等）
    //
    // 輸出檔案：
    // - <filename>-mono.pdf: 純翻譯版本
    // - <filename>-dual.pdf: 雙語對照版本

    const args = [inputPath, "-lo", targetLang, "-o", outputDir, "-s", service];

    // pdf2zh 使用 babeldoc.assets 內部載入模型，不需要手動指定 --onnx 參數
    // 模型路徑：/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx

    console.log(`[PDFMathTranslate] Running: pdf2zh ${args.join(" ")} (service: ${service})`);

    // 使用注入的 execFile 函數
    execFile("pdf2zh", args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`pdf2zh error (${service}): ${error}\nstderr: ${stderr}`));
        return;
      }

      if (stdout) {
        console.log(`[PDFMathTranslate] stdout: ${stdout}`);
      }

      if (stderr) {
        console.log(`[PDFMathTranslate] stderr: ${stderr}`);
      }

      // 找到輸出的 PDF 檔案
      const inputFileName = basename(inputPath, ".pdf");
      const monoPath = join(outputDir, `${inputFileName}-mono.pdf`);
      const dualPath = join(outputDir, `${inputFileName}-dual.pdf`);

      // 檢查輸出檔案是否存在
      if (!existsSync(monoPath) && !existsSync(dualPath)) {
        // 嘗試在 outputDir 下尋找任何 PDF 檔案
        const files = readdirSync(outputDir);
        const pdfFiles = files.filter((f) => f.endsWith(".pdf"));
        console.log(`[PDFMathTranslate] Found PDF files: ${pdfFiles.join(", ")}`);

        if (pdfFiles.length === 0) {
          reject(new Error(`No output PDF files found in ${outputDir} (service: ${service})`));
          return;
        }
      }

      resolve({ monoPath, dualPath });
    });
  });
}

/**
 * 執行 pdf2zh 命令進行 PDF 翻譯（自動 fallback）
 *
 * 嘗試順序：
 * 1. 環境變數 PDFMATHTRANSLATE_SERVICE（如果設定）
 * 2. Google Translate（免費，需要網路）
 * 3. Bing Translate（免費備援）
 *
 * @param inputPath 輸入 PDF 路徑
 * @param outputDir 輸出目錄
 * @param targetLang 目標語言
 * @param execFile execFile 函數（用於測試注入）
 */
async function runPdf2zh(
  inputPath: string,
  outputDir: string,
  targetLang: string,
  execFile: ExecFileFn = execFileOriginal,
): Promise<{ monoPath: string; dualPath: string }> {
  // 如果使用者指定了服務，只用那個服務
  const envService = process.env.PDFMATHTRANSLATE_SERVICE;
  if (envService) {
    console.log(`[PDFMathTranslate] Using user-specified service: ${envService}`);
    return runPdf2zhWithService(
      inputPath,
      outputDir,
      targetLang,
      envService as TranslationService,
      execFile,
    );
  }

  // 自動 fallback：依序嘗試各個服務
  const errors: string[] = [];

  for (const service of TRANSLATION_SERVICES) {
    try {
      console.log(`[PDFMathTranslate] Trying translation service: ${service}`);
      const result = await runPdf2zhWithService(
        inputPath,
        outputDir,
        targetLang,
        service,
        execFile,
      );
      console.log(`[PDFMathTranslate] ✅ Success with service: ${service}`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[PDFMathTranslate] ⚠️ Service ${service} failed: ${errorMsg}`);
      errors.push(`${service}: ${errorMsg}`);

      // 清理失敗的輸出檔案，準備下一次嘗試
      try {
        const files = readdirSync(outputDir);
        for (const file of files) {
          if (file.endsWith(".pdf") && file !== basename(inputPath)) {
            unlinkSync(join(outputDir, file));
          }
        }
      } catch {
        // 忽略清理錯誤
      }
    }
  }

  // 所有服務都失敗
  throw new Error(`All translation services failed:\n${errors.join("\n")}`);
}

/**
 * 主要轉換函數
 *
 * @param filePath 輸入 PDF 檔案路徑
 * @param fileType 檔案類型（應為 "pdf"）
 * @param convertTo 目標格式（如 "pdf-zh"）
 * @param targetPath 輸出路徑
 * @param options 額外選項
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
  try {
    // 1. 檢查模型（警告但不阻止，因為 pdf2zh 可能會自動下載）
    checkModelsExist();

    // 2. 提取並標準化目標語言
    const rawLang = extractTargetLanguage(convertTo);
    const targetLang = normalizeLanguageCode(rawLang);
    console.log(`[PDFMathTranslate] Translating to: ${targetLang} (raw: ${rawLang})`);

    // 3. 建立臨時輸出目錄
    const outputDir = dirname(targetPath);
    const inputFileName = basename(filePath, `.${fileType}`);
    const tempDir = join(outputDir, `${inputFileName}_pdfmathtranslate_${Date.now()}`);

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // 4. 建立封裝用目錄
    const archiveDir = join(tempDir, "archive");
    mkdirSync(archiveDir, { recursive: true });

    // 5. 執行 pdf2zh 翻譯
    const { monoPath, dualPath } = await runPdf2zh(filePath, tempDir, targetLang, execFile);

    // 6. 複製翻譯後的檔案到封裝目錄
    // PDFMathTranslate 輸出：
    //   - mono: 純翻譯版本（translated-<lang>.pdf）
    //   - dual: 雙語對照版本（bilingual-<lang>.pdf）
    // ⚠️ 不包含原始 PDF，只包含翻譯結果

    const translatedDest = join(archiveDir, `translated-${targetLang}.pdf`);
    const bilingualDest = join(archiveDir, `bilingual-${targetLang}.pdf`);

    // 檢查各種可能的 mono 輸出檔案名稱
    const possibleMonoOutputs = [monoPath, join(tempDir, `${inputFileName}-mono.pdf`)];

    // 檢查各種可能的 dual 輸出檔案名稱
    const possibleDualOutputs = [dualPath, join(tempDir, `${inputFileName}-dual.pdf`)];

    let foundMono = false;
    let foundDual = false;

    // 複製 mono（翻譯版）
    for (const outputPath of possibleMonoOutputs) {
      if (existsSync(outputPath)) {
        copyFileSync(outputPath, translatedDest);
        foundMono = true;
        console.log(`[PDFMathTranslate] Copied mono (translated): ${outputPath}`);
        break;
      }
    }

    // 複製 dual（對照版）
    for (const outputPath of possibleDualOutputs) {
      if (existsSync(outputPath)) {
        copyFileSync(outputPath, bilingualDest);
        foundDual = true;
        console.log(`[PDFMathTranslate] Copied dual (bilingual): ${outputPath}`);
        break;
      }
    }

    // 如果找不到預期的輸出檔案，嘗試找任何 PDF
    if (!foundMono && !foundDual) {
      const allFiles = readdirSync(tempDir);
      const pdfFiles = allFiles.filter((f) => f.endsWith(".pdf") && f !== basename(filePath));

      for (const pdfName of pdfFiles) {
        const pdfPath = join(tempDir, pdfName);
        if (pdfName.includes("mono") || pdfName.includes("translated")) {
          copyFileSync(pdfPath, translatedDest);
          foundMono = true;
          console.log(`[PDFMathTranslate] Using fallback mono: ${pdfPath}`);
        } else if (pdfName.includes("dual") || pdfName.includes("bilingual")) {
          copyFileSync(pdfPath, bilingualDest);
          foundDual = true;
          console.log(`[PDFMathTranslate] Using fallback dual: ${pdfPath}`);
        }
      }
    }

    if (!foundMono && !foundDual) {
      throw new Error("No translated PDF output found (neither mono nor dual)");
    }

    console.log(`[PDFMathTranslate] Archive contents: mono=${foundMono}, dual=${foundDual}`);

    // 8. 建立 .tar 封裝
    const tarPath = getArchiveFileName(targetPath);
    const tarDir = dirname(tarPath);
    if (!existsSync(tarDir)) {
      mkdirSync(tarDir, { recursive: true });
    }

    await createTarArchive(archiveDir, tarPath, execFile);
    console.log(`[PDFMathTranslate] Created archive: ${tarPath}`);

    // 9. 清理臨時目錄
    removeDir(tempDir);

    return "Done";
  } catch (error) {
    throw new Error(`PDFMathTranslate error: ${error}`);
  }
}
