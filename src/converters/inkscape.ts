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
 *    Inkscape 1.0+ 的新版命令列語法支援 headless 執行，
 *    不需要 X11 或 xvfb。
 *
 * 🔧 正確的 headless-safe 語法：
 *    inkscape input.png --export-type=svg --export-filename=output.svg
 *
 * ❌ 舊版語法（會觸發 GTK 初始化）：
 *    inkscape input.png -o output.svg
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

    // 使用 Inkscape 1.0+ 的 headless-safe 命令列語法
    // --export-type: 明確指定輸出格式
    // --export-filename: 指定輸出檔案路徑
    // 這種語法不會初始化 GTK，因此在無 DISPLAY 的環境也能運作
    const args = [filePath, `--export-type=${exportType}`, `--export-filename=${targetPath}`];

    execFile("inkscape", args, (error: Error | null, stdout: string, stderr: string) => {
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
