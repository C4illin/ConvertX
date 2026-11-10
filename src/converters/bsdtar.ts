import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types";

export const properties = {
  from: {
    archive: [
      "7z",
      "bz2",
      "cab",
      "cpio",
      "gz",
      "iso",
      "rar",
      "tar",
      "tar.bz2",
      "tar.gz",
      "tar.xz",
      "tbz2",
      "tgz",
      "txz",
      "xz",
      "zip",
    ],
  },
  to: {
    archive: ["7z", "tar", "tar.bz2", "tar.gz", "tar.xz", "zip"],
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
  const args: string[] = ["-a", "-cf", targetPath, `@${filePath}`];

  return new Promise((resolve, reject) => {
    execFile("bsdtar", args, (error, stdout, stderr) => {
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
