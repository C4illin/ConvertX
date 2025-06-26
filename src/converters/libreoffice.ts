import { execFile } from "node:child_process";

export const properties = {
  from: {
    text: ["docx", "txt"],
  },
  to: {
    text: ["pdf", "txt"],
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
  const outputPath = targetPath.split("/").slice(0, -1).join("/").replace("./", "");
  // Build arguments array
  const args: string[] = [];

  args.push("--headless");
  args.push("--convert-to", convertTo, filePath);
  args.push("--outdir", outputPath);

  return new Promise((resolve, reject) => {
    execFile("soffice", args, (error, stdout, stderr) => {
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
