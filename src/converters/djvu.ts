import { execFile as execFileOriginal } from "node:child_process";
import type { ExecFileFn } from "./types";

export const properties = {
  from: {
    document: ["djvu", "djv"],
  },
  to: {
    document: ["pdf", "tiff"],
  },
};

export function convert(
  filePath: string,
  _fileType: string,
  convertTo: string,
  targetPath: string,
  _options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("ddjvu", [`-format=${convertTo}`, filePath, targetPath], (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}${stderr ? `\nstderr: ${stderr}` : ""}`);
        return;
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
