import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    document: [
      "azw4",
      "chm",
      "cbr",
      "cbz",
      "cbt",
      "cba",
      "cb7",
      "djvu",
      "docx",
      "epub",
      "fb2",
      "htlz",
      "html",
      "lit",
      "lrf",
      "mobi",
      "odt",
      "pdb",
      "pdf",
      "pml",
      "rb",
      "rtf",
      "recipe",
      "snb",
      "tcr",
      "txt",
    ],
  },
  to: {
    document: [
      "azw3",
      "docx",
      "epub",
      "fb2",
      "html",
      "htmlz",
      "kepub.epub",
      "lit",
      "lrf",
      "mobi",
      "oeb",
      "pdb",
      "pdf",
      "pml",
      "rb",
      "rtf",
      "snb",
      "tcr",
      "txt",
      "txtz",
    ],
  },
};

/**
 * Calibre ebook-convert 轉換器
 *
 * ⚠️ Headless 環境注意事項：
 *    Calibre 是 Qt 應用，某些操作需要 display。
 *    使用 xvfb-run 確保在無 DISPLAY 環境下也能運作。
 *
 * 環境變數設定（Dockerfile）：
 *    QT_QPA_PLATFORM=offscreen
 *    QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox"
 */
export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 使用 xvfb-run 包裝 ebook-convert，確保在無 DISPLAY 環境下也能運作
    const args = [
      "-a",
      "--server-args=-screen 0 1024x768x24",
      "ebook-convert",
      filePath,
      targetPath,
    ];

    execFile("xvfb-run", args, (error, stdout, stderr) => {
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
