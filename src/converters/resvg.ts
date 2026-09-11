import { defaultExecFile, ExecFileFn } from "./types";

export const properties = {
  from: {
    images: ["svg"],
  },
  to: {
    images: ["png"],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = defaultExecFile, // to make it mockable
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("resvg", [filePath, targetPath], (error, stdout, stderr) => {
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
