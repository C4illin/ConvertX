import { execFile as execFileOriginal } from "node:child_process";

import { ExecFileFn } from "./types";

export const properties = {
  from: {
    text: ["docx", "docm", "dotx"],
    presentation: ["pptx", "pptm", "potx"],
    calc: ["xlsx", "xlsm", "xltx", "xltm"],
  },
  to: {
    text: ["pdf", "png"],
    presentation: ["pdf", "png"],
    calc: ["pdf"],
  },
};

const presentations = new Set(properties.from.presentation);
const workbooks = new Set(properties.from.calc);

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  // png draws the first page (the first slide); pdf converts the whole
  // document, every slide, or the print areas of every visible sheet.
  // --strict: when the document holds content Oxi does not draw, it writes
  // nothing and fails (naming the content) rather than hand back a file with
  // parts missing; LibreOffice can then be chosen instead.
  // --quiet: nothing is printed on success, only warnings and errors
  const kind = presentations.has(fileType) ? "pptx" : workbooks.has(fileType) ? "xlsx" : "docx";
  const command = `${kind}-to-${convertTo === "png" ? "png" : "pdf"}`;

  return new Promise((resolve, reject) => {
    execFile(
      "oxidocs",
      [command, "--strict", "--quiet", filePath, targetPath],
      (error, stdout, stderr) => {
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
      },
    );
  });
}
