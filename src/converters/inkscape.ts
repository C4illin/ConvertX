import { execFile as execFileOriginal } from "node:child_process";
import { ExecFileFn } from "./types.ts";

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

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("inkscape", [filePath, "-o", targetPath], options, (error, stdout, stderr) => {
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
