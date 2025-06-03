import { execFile } from "node:child_process";

export const properties = {
  from: {
    images: ["dvi", "xdv", "pdf", "eps"],
  },
  to: {
    images: ["svg", "svgz"],
  },
};

export function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: unknown,
): Promise<string> {
  const inputArgs: string[] = [];
  if (fileType === "eps") {
    inputArgs.push("--eps");
  }
  if (fileType === "pdf") {
    inputArgs.push("--pdf");
  }
  if (convertTo === "svgz") {
    inputArgs.push("-z");
  }

  return new Promise((resolve, reject) => {
    execFile(
      "dvisvgm",
      [...inputArgs, filePath, "-o", targetPath],
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
