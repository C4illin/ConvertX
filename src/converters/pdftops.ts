import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    document: ["pdf"],
  },
  to: {
    document: ["eps", "ps"],
  },
};

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  const args: string[] = [];

  if (convertTo === "eps") {
    args.push("-eps");
  }

  args.push(filePath, targetPath);

  return new Promise((resolve, reject) => {
    execFile("pdftops", args, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}`);
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
