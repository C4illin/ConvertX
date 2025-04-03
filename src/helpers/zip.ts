import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "path";
import { getAllTargets } from "../converters/main";

export const zip = (inputPath: string, outputPath: string) => {
  return new Promise((resolve, reject) => {
    const absoluteInputPath = path.resolve(inputPath);
    const absoluteOutputPath = path.resolve(outputPath);

    const allTargets = getAllTargets();
    const supportedExtensions = new Set<string>();

    Object.values(allTargets).forEach((extensions) => {
      extensions.forEach((ext) => supportedExtensions.add(ext));
    });

    fs.readdir(absoluteInputPath, { withFileTypes: true }, (err, entries) => {
      if (err) {
        return reject(err);
      }

      const files = entries
        .filter((entry) => entry.isFile())
        .filter((entry) => entry.name !== path.basename(outputPath))
        .map((entry) => entry.name)
        .filter((filename) => {
          // We don't want to zip files with unsafe characters
          if (!/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(filename)) {
            return false;
          }

          const extension = path.extname(filename).substring(1).toLowerCase();
          return supportedExtensions.has(extension);
        });

      if (files.length === 0) {
        return reject(new Error("No files to zip"));
      }

      execFile(
        "zip",
        ["-j", absoluteOutputPath, ...files],
        { cwd: absoluteInputPath },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
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
  });
};
