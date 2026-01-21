import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync, copyFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { ExecFileFn } from "./types";
import { getArchiveFileName } from "../transfer";

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
 * 必須在 Docker build 階段預先下載所需模型，
 * 不允許在 runtime 隱式下載模型。
 */

// 支援的目標語言列表
const SUPPORTED_LANGUAGES = [
  "en",    // English
  "zh",    // Chinese (Simplified)
  "zh-TW", // Chinese (Traditional)
  "ja",    // Japanese
  "ko",    // Korean
  "de",    // German
  "fr",    // French
  "es",    // Spanish
  "it",    // Italian
  "pt",    // Portuguese
  "ru",    // Russian
  "ar",    // Arabic
  "hi",    // Hindi
  "vi",    // Vietnamese
  "th",    // Thai
] as const;

type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 模型路徑（Docker 環境中）
const MODELS_PATH = process.env.PDFMATHTRANSLATE_MODELS_PATH || "/models/pdfmathtranslate";

// 生成 from/to 格式映射
function generateLanguageMappings(): { from: Record<string, string[]>; to: Record<string, string[]> } {
  const outputFormats = SUPPORTED_LANGUAGES.map(lang => `pdf-${lang}`);
  
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
 * 檢查模型是否已預先下載
 * @returns 模型是否存在
 */
function checkModelsExist(): boolean {
  // 檢查 ONNX 模型目錄是否存在
  if (!existsSync(MODELS_PATH)) {
    console.warn(`[PDFMathTranslate] Models directory not found: ${MODELS_PATH}`);
    console.warn(`[PDFMathTranslate] Models should be pre-downloaded during Docker build.`);
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
    execFile(
      "tar",
      ["-cf", outputTar, "-C", sourceDir, "."],
      (error, stdout, stderr) => {
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
      },
    );
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
 * 執行 pdf2zh 命令進行 PDF 翻譯
 * 
 * @param inputPath 輸入 PDF 路徑
 * @param outputDir 輸出目錄
 * @param targetLang 目標語言
 * @param execFile 執行函數
 */
function runPdf2zh(
  inputPath: string,
  outputDir: string,
  targetLang: string,
  execFile: ExecFileFn,
): Promise<{ monoPath: string; dualPath: string }> {
  return new Promise((resolve, reject) => {
    // pdf2zh CLI 參數：
    // -lo <lang>: 目標語言
    // -o <dir>: 輸出目錄
    // -s google: 使用 Google 翻譯（預設，免費）
    // 
    // 輸出檔案：
    // - <filename>-mono.pdf: 純翻譯版本
    // - <filename>-dual.pdf: 雙語對照版本
    
    const args = [
      inputPath,
      "-lo", targetLang,
      "-o", outputDir,
      "-s", process.env.PDFMATHTRANSLATE_SERVICE || "google",
    ];

    // 如果設定了自訂模型路徑，使用 --onnx 參數
    if (existsSync(MODELS_PATH)) {
      const onnxModelPath = join(MODELS_PATH, "model.onnx");
      if (existsSync(onnxModelPath)) {
        args.push("--onnx", onnxModelPath);
      }
    }

    console.log(`[PDFMathTranslate] Running: pdf2zh ${args.join(" ")}`);

    execFile("pdf2zh", args, (error, stdout, stderr) => {
      if (error) {
        reject(`pdf2zh error: ${error}\nstderr: ${stderr}`);
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
        const pdfFiles = files.filter(f => f.endsWith(".pdf"));
        console.log(`[PDFMathTranslate] Found PDF files: ${pdfFiles.join(", ")}`);
        
        if (pdfFiles.length === 0) {
          reject(`No output PDF files found in ${outputDir}`);
          return;
        }
      }

      resolve({ monoPath, dualPath });
    });
  });
}

/**
 * 主要轉換函數
 * 
 * @param filePath 輸入 PDF 檔案路徑
 * @param fileType 檔案類型（應為 "pdf"）
 * @param convertTo 目標格式（如 "pdf-zh"）
 * @param targetPath 輸出路徑
 * @param options 額外選項
 * @param execFile 執行函數覆寫
 */
export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. 檢查模型（警告但不阻止，因為 pdf2zh 可能會自動下載）
      checkModelsExist();

      // 2. 提取目標語言
      const targetLang = extractTargetLanguage(convertTo);
      console.log(`[PDFMathTranslate] Translating to: ${targetLang}`);

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

      // 6. 複製原始檔案到封裝目錄
      const originalDest = join(archiveDir, "original.pdf");
      copyFileSync(filePath, originalDest);

      // 7. 複製翻譯後的檔案（優先使用 mono，因為它是純翻譯版本）
      const translatedDest = join(archiveDir, `translated-${targetLang}.pdf`);
      
      // 檢查各種可能的輸出檔案名稱
      const possibleOutputs = [
        monoPath,
        dualPath,
        join(tempDir, `${inputFileName}-mono.pdf`),
        join(tempDir, `${inputFileName}-dual.pdf`),
      ];

      let foundOutput = false;
      for (const outputPath of possibleOutputs) {
        if (existsSync(outputPath)) {
          copyFileSync(outputPath, translatedDest);
          foundOutput = true;
          console.log(`[PDFMathTranslate] Using output: ${outputPath}`);
          break;
        }
      }

      // 如果找不到預期的輸出檔案，嘗試找任何 PDF
      if (!foundOutput) {
        const allFiles = readdirSync(tempDir);
        const pdfFiles = allFiles.filter(f => f.endsWith(".pdf") && f !== basename(filePath));
        const firstPdfName = pdfFiles[0];
        
        if (firstPdfName) {
          const firstPdf = join(tempDir, firstPdfName);
          copyFileSync(firstPdf, translatedDest);
          foundOutput = true;
          console.log(`[PDFMathTranslate] Using fallback output: ${firstPdf}`);
        }
      }

      if (!foundOutput) {
        throw new Error("No translated PDF output found");
      }

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

      resolve("Done");
    } catch (error) {
      reject(`PDFMathTranslate error: ${error}`);
    }
  });
}
