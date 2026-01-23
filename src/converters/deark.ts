import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { ExecFileFn } from "./types";

/**
 * deark 轉換器
 *
 * deark 是一個用於解碼和轉換各種二進位格式的工具：
 * - 解包壓縮檔案（ZIP、LHA、ARC 等）
 * - 解析舊格式圖片（BMP、ICO、PCX、GIF 等）
 * - 提取嵌入資源（EXE、遊戲檔案等）
 *
 * @see https://github.com/jsummers/deark
 * @see https://entropymine.com/deark/
 */

export const properties = {
  from: {
    // 所有 deark 支援的格式合併為一個類別
    files: [
      // 壓縮/封存格式
      "zip",
      "lha",
      "lzh",
      "arc",
      "arj",
      "zoo",
      "z",
      "gz",
      "bz2",
      "xz",
      "cab",
      "sit",
      "sitx",
      "stuffit",
      "hqx",
      "bin",
      "macbin",
      "cpio",
      "rpm",
      "deb",
      "ar",
      "a",
      // 圖片格式
      "ico",
      "cur",
      "ani",
      "icns",
      "bmp",
      "dib",
      "pcx",
      "dcx",
      "pict",
      "pic",
      "pct",
      "wmf",
      "emf",
      "gem",
      "img",
      "mac",
      "msp",
      "iff",
      "ilbm",
      "lbm",
      "ham",
      "xbm",
      "xpm",
      "ras",
      "sun",
      "tga",
      "vst",
      "icb",
      "vda",
      "sgi",
      "rgb",
      "rgba",
      "bw",
      "int",
      "inta",
      "psd",
      "xcf",
      "ora",
      "kra",
      "psp",
      "jbig",
      "jbg",
      "fpx",
      // 字型格式
      "fon",
      "fnt",
      "psf",
      "bdf",
      "pcf",
      // 可執行檔 / 資源檔
      "exe",
      "dll",
      "com",
      "ne",
      "mz",
      "res",
      "rsrc",
      "icl",
      // 其他格式
      "swf",
      "fla",
      "amiga",
      "adf",
      "dms",
      "d64",
      "t64",
      "prg",
      "crt",
      "tap",
      "tzx",
      "riff",
    ],
  },
  to: {
    files: ["extract"],
  },
  // deark 輸出可能是多個檔案，使用 archive 模式
  outputMode: "archive" as const,
};

/**
 * Helper function to create a .tar archive from a directory
 */
function createTarArchive(
  sourceDir: string,
  outputTar: string,
  execFile: ExecFileFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
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
 * Count files in a directory (including subdirectories)
 */
function countFiles(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  let count = 0;
  const files = readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      count += countFiles(join(dirPath, file.name));
    } else {
      count++;
    }
  }
  return count;
}

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  // Create a temporary output directory for deark
  const outputDir = dirname(targetPath);
  const inputFileName = basename(filePath, `.${fileType}`);
  const dearkOutputDir = join(outputDir, `${inputFileName}_deark_extract`);

  // Ensure output directory exists
  if (!existsSync(dearkOutputDir)) {
    mkdirSync(dearkOutputDir, { recursive: true });
  }

  /**
   * Execute deark with proper options
   *
   * deark 常用參數：
   * -od <dir>     輸出目錄
   * -a            提取更多資料（包含縮圖等輔助檔案）
   * -zip          輸出為 ZIP 格式（我們使用 tar）
   * -l            僅列出檔案不提取
   * -m <module>   指定處理模組
   */
  const runDeark = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Build deark command arguments
      const args = [
        "-od",
        dearkOutputDir, // Output directory
        "-a", // Extract all (including auxiliary files)
        "-nomodtime", // Don't modify file timestamps
        filePath, // Input file
      ];

      console.log(`[deark] Running: deark ${args.join(" ")}`);

      execFile("deark", args, (error, stdout, stderr) => {
        if (stdout) {
          console.log(`deark stdout: ${stdout}`);
        }

        if (stderr) {
          console.error(`deark stderr: ${stderr}`);
        }

        if (error) {
          // Check for common deark errors
          const errorStr = String(error) + String(stderr);

          if (errorStr.includes("Unknown or unsupported")) {
            reject(new Error(`deark: 不支援此檔案格式 (${fileType})`));
          } else if (errorStr.includes("Failed to read")) {
            reject(new Error(`deark: 無法讀取檔案 - ${filePath}`));
          } else {
            reject(new Error(`deark error: ${error}`));
          }
          return;
        }

        resolve();
      });
    });
  };

  // Execute deark
  try {
    await runDeark();
  } catch (error) {
    // Cleanup on error
    removeDir(dearkOutputDir);
    throw error;
  }

  // Check if any files were extracted
  const fileCount = countFiles(dearkOutputDir);
  if (fileCount === 0) {
    removeDir(dearkOutputDir);
    throw new Error(`deark: 沒有可提取的檔案 (${fileType})`);
  }

  // Create .tar archive from the output directory
  try {
    const tarOutputPath = `${targetPath}.tar`;
    await createTarArchive(dearkOutputDir, tarOutputPath, execFile);

    console.log(`[deark] Created tar archive: ${tarOutputPath} (${fileCount} files)`);

    // Cleanup temporary directory
    removeDir(dearkOutputDir);

    return `Done - extracted ${fileCount} file(s)`;
  } catch (error) {
    removeDir(dearkOutputDir);
    throw new Error(`Failed to create tar archive: ${error}`);
  }
}
