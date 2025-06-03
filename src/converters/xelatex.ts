import { execFile } from "node:child_process";

export const properties = {
  from: {
    text: ["tex", "latex"],
  },
  to: {
    text: ["pdf"],
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
  return new Promise((resolve, reject) => {
    // const fileName: string = (targetPath.split("/").pop() as string).replace(".pdf", "")
    const outputPath = targetPath.split("/").slice(0, -1).join("/").replace("./", "");

    execFile(
      "latexmk",
      ["-xelatex", "-interaction=nonstopmode", `-output-directory=${outputPath}`, filePath],
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
