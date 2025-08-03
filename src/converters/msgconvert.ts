import { execFile } from "node:child_process";

export const properties = {
  from: {
    email: ["msg"],
  },
  to: {
    email: ["eml"],
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
    if (fileType === "msg" && convertTo === "eml") {
      // Convert MSG to EML using msgconvert
      // msgconvert will output to the same directory as the input file with .eml extension
      // We need to use --outfile to specify the target path
      const args = ["--outfile", targetPath, filePath];
      
      execFile("msgconvert", args, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`msgconvert failed: ${error.message}`));
          return;
        }

        if (stderr) {
          // Log sanitized stderr to avoid exposing sensitive paths
          const sanitizedStderr = stderr.replace(/(\/[^\s]+)/g, "[REDACTED_PATH]");
          console.warn(`msgconvert stderr: ${sanitizedStderr.length > 200 ? sanitizedStderr.slice(0, 200) + '...' : sanitizedStderr}`);
        }

        resolve(targetPath);
      });
    } else {
      reject(new Error(`Unsupported conversion from ${fileType} to ${convertTo}. Only MSG to EML conversion is currently supported.`));
    }
  });
}
