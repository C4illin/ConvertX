import { execFile as execFileOriginal } from "node:child_process";
import { extname } from "node:path";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    images: ["svg", "pdf", "eps", "ps", "wmf", "emf", "png"],
  },
  to: {
    images: [
      "dxf",
      "emf",
      "eps",
      "fxg",
      "gpl",
      "hpgl",
      "html",
      "odg",
      "pdf",
      "png",
      "pov",
      "ps",
      "sif",
      "svg",
      "svgz",
      "tex",
      "wmf",
    ],
  },
};

/**
 * Inkscape 轉換器
 *
 * ⚠️ Headless 環境注意事項：
 *    某些 Inkscape 操作（如 PNG 轉 SVG）需要 GTK 初始化，
 *    在無 DISPLAY 環境下需要使用 xvfb-run 包裝。
 *
 * 🔧 使用 xvfb-run 的 headless 語法：
 *    xvfb-run -a inkscape input.png --export-type=svg --export-filename=output.svg
 *
 * 參考：https://inkscape.org/doc/inkscape-man.html
 */
export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 從目標路徑取得輸出格式（移除開頭的點）
    const exportType = extname(targetPath).slice(1).toLowerCase();

    // 使用 xvfb-run 包裝 Inkscape 命令，確保在無 DISPLAY 環境下也能運作
    // -a: 自動選擇可用的 display number
    // --server-args="-screen 0 1024x768x24": 設定虛擬螢幕解析度
    const args = [
      "-a",
      "--server-args=-screen 0 1024x768x24",
      "inkscape",
      filePath,
      `--export-type=${exportType}`,
      `--export-filename=${targetPath}`,
    ];

    // 使用 xvfb-run 而非直接呼叫 inkscape
    execFile("xvfb-run", args, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(`error: ${error}`);
        return;
      }

      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }

      if (stderr) {
        // Inkscape 經常輸出警告到 stderr，但這不代表失敗
        console.log(`stderr: ${stderr}`);
      }

      resolve("Done");
    });
  });
}
