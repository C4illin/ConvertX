import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

// LibreOffice can already produce a docx from a pdf, but its pdf import maps
// every line onto a floating text box: the result carries the words and none of
// the structure, so tables disappear and the document cannot practically be
// edited. pdf2docx reconstructs paragraphs, tables and images instead, which is
// what someone converting an invoice or a contract is actually asking for.
//
// It only handles this one direction, so LibreOffice keeps everything else.
export const properties = {
  from: {
    document: ["pdf"],
  },
  to: {
    document: ["docx"],
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
    execFile("pdf2docx", ["convert", filePath, targetPath], (err, stdout, stderr) => {
      if (err) {
        reject(`pdf2docx error: ${err}`);
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
