import { execFile as execFileOriginal } from "node:child_process";
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
 *    Inkscape 需要 X11 顯示器連線。在 Docker/Server 環境中，
 *    必須使用 xvfb-run 建立虛擬顯示器。
 *
 * 🔧 解決方案：
 *    1. 優先使用 xvfb-run（虛擬 X11）
 *    2. 若 xvfb-run 失敗，嘗試 GDK_BACKEND=svg（純 SVG 後端）
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
    // 使用 xvfb-run 執行 Inkscape（建立虛擬 X11 顯示器）
    // -a: 自動尋找可用的 display number
    // --server-args: 設定虛擬螢幕解析度
    const xvfbArgs = [
      "-a",
      "--server-args=-screen 0 1024x768x24",
      "inkscape",
      filePath,
      "-o",
      targetPath,
    ];

    execFile("xvfb-run", xvfbArgs, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        // xvfb-run 失敗，回退到直接執行 inkscape
        // 這可能在某些已有 DISPLAY 設定的環境中運作
        console.log("[Inkscape] xvfb-run failed, trying direct inkscape execution...");
        console.log(`[Inkscape] Original error: ${error.message}`);

        execFile(
          "inkscape",
          [filePath, "-o", targetPath],
          (error2: Error | null, stdout2: string, stderr2: string) => {
            if (error2) {
              reject(`error: ${error2}`);
              return;
            }

            if (stdout2) {
              console.log(`stdout: ${stdout2}`);
            }

            if (stderr2) {
              console.error(`stderr: ${stderr2}`);
            }

            resolve("Done");
          },
        );
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
