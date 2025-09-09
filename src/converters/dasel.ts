import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    document: ["yaml", "toml", "json", "xml", "csv"],
  },
  to: {
    document: ["yaml", "toml", "json", "csv"],
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

  args.push("--file", filePath);
  args.push("--read", fileType);
  args.push("--write", convertTo);

  const fs = require("fs");
  return new Promise((resolve, reject) => {
    execFile("dasel", args, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error}`);
        return;
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      fs.writeFile(targetPath, stdout, (err: NodeJS.ErrnoException | null) => {
        if (err) {
          reject(`Failed to write output: ${err}`);
        } else {
          resolve("Done");
        }
      });
    });
  });
}
