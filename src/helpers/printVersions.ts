import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { version } from "../../package.json";

console.log(`ConvertX v${version}`);

// 帶 timeout 的 exec 包裝函數，防止 CI 環境卡住
const execWithTimeout = (
  cmd: string,
  timeoutMs = 5000,
): Promise<{ stdout: string; stderr: string; error: Error | null }> => {
  return new Promise((resolve) => {
    const child = exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({ stdout: stdout || "", stderr: stderr || "", error });
    });
    // 設定額外保險 timeout
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ stdout: "", stderr: "", error: new Error(`Command timeout: ${cmd}`) });
    }, timeoutMs + 1000);
    // 正常完成時清除 timer
    child.on("close", () => clearTimeout(timer));
  });
};

// 定義所有要檢查的工具
const tools = [
  {
    cmd: "pandoc -v",
    name: "Pandoc",
    errorMsg: "Pandoc is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "ffmpeg -version",
    name: "FFmpeg",
    errorMsg: "FFmpeg is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "vips -v",
    name: "Vips",
    errorMsg: "Vips is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "magick --version",
    name: "ImageMagick",
    errorMsg: "ImageMagick is not installed.",
    formatter: (s: string) => s.split("\n")[0]?.replace("Version: ", ""),
  },
  {
    cmd: "gm version",
    name: "GraphicsMagick",
    errorMsg: "GraphicsMagick is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "inkscape --version",
    name: "Inkscape",
    errorMsg: "Inkscape is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "djxl --version",
    name: "libjxl",
    errorMsg: "libjxl-tools is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "dasel --version",
    name: "dasel",
    errorMsg: "dasel is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "xelatex -version",
    name: "XeTeX",
    errorMsg: "Tex Live with XeTeX is not installed.",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "resvg -V",
    name: "resvg",
    errorMsg: "resvg is not installed",
    formatter: (s: string) => `resvg v${s.split("\n")[0]}`,
  },
  {
    cmd: "assimp version",
    name: "assimp",
    errorMsg: "assimp is not installed",
    formatter: (s: string) => `assimp ${s.split("\n")[5]}`,
  },
  {
    cmd: "ebook-convert --version",
    name: "calibre",
    errorMsg: "ebook-convert (calibre) is not installed",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "heif-info -v",
    name: "libheif",
    errorMsg: "libheif is not installed",
    formatter: (s: string) => `libheif v${s.split("\n")[0]}`,
  },
  {
    cmd: "potrace -v",
    name: "potrace",
    errorMsg: "potrace is not installed",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "soffice --version",
    name: "LibreOffice",
    errorMsg: "libreoffice is not installed",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "msgconvert --version",
    name: "msgconvert",
    errorMsg: "msgconvert (libemail-outlook-message-perl) is not installed",
    formatter: (s: string) => s.split("\n")[0],
  },
  {
    cmd: "bun -v",
    name: "Bun",
    errorMsg: "Bun is not installed. wait what",
    formatter: (s: string) => `Bun v${s.split("\n")[0]}`,
  },
];

if (process.env.NODE_ENV === "production") {
  (async () => {
    // 讀取 OS 資訊
    try {
      const osRelease = await readFile("/etc/os-release", "utf8");
      const prettyName = osRelease.split('PRETTY_NAME="')[1]?.split('"')[0];
      if (prettyName) console.log(prettyName);
    } catch {
      console.error("Not running on docker, this is not supported.");
    }

    // 並行執行所有工具版本檢查，每個都有 timeout
    const results = await Promise.allSettled(
      tools.map(async (tool) => {
        const { stdout, stderr, error } = await execWithTimeout(tool.cmd, 5000);
        return { tool, stdout, stderr, error };
      }),
    );

    // 輸出結果
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { tool, stdout, stderr, error } = result.value;
        if (error) {
          console.error(tool.errorMsg);
        } else {
          // 有些工具把版本資訊輸出到 stderr（例如 djxl）
          const output = stdout || stderr;
          if (output) {
            console.log(tool.formatter(output));
          }
        }
      }
    }
  })();
}
