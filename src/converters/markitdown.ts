import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    document: [
      "pdf",
      "pptx",
      "docx",
      "xlsx",
      "xls",
      "pdf",
      "wav",
      "mp3",
      "epub",
      "html",
      "csv",
      "json",
      "xml",
      "zip",
    ],
  },
  to: {
    document: ["md"],
  },
};

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("markitdown", [filePath, "-o", targetPath], (err, stdout, stderr) => {
      if (err) {
        reject(`markitdown error: ${err}`);
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
