import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    images: ["pnm", "pbm", "pgm", "bmp"],
  },
  to: {
    images: [
      "svg",
      "pdf",
      "pdfpage",
      "eps",
      "postscript",
      "ps",
      "dxf",
      "geojson",
      "pgm",
      "gimppath",
      "xfig",
    ],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("potrace", [filePath, "-o", targetPath, "-b", convertTo], (error, stdout, stderr) => {
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
