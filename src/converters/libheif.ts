import { execFile } from "child_process";

export const properties = {
  from: {
    images: ["avci", "avcs", "avif", "h264", "heic", "heics", "heif", "heifs", "hif", "mkv", "mp4"],
  },
  to: {
    images: ["jpeg", "png", "y4m"],
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
    execFile("heif-convert", [filePath, targetPath], (error, stdout, stderr) => {
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
