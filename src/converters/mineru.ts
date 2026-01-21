import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { ExecFileFn } from "./types";
import { getArchiveFileName } from "../transfer";

export const properties = {
  from: {
    document: ["pdf", "ppt", "pptx", "xls", "xlsx", "doc", "docx"],
  },
  to: {
    document: ["md-t", "md-i"],
  },
  outputMode: "archive" as const,
};

/**
 * Helper function to create a .tar archive from a directory (no compression)
 *
 * ⚠️ 重要：僅使用 .tar 格式，禁止 .tar.gz / .tgz / .zip
 */
function createTarArchive(
  sourceDir: string,
  outputTar: string,
  execFile: ExecFileFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use tar command to create archive (without gzip compression)
    // tar -cf <output.tar> -C <sourceDir> .
    // 注意：使用 -cf 而非 -czf，避免 gzip 壓縮
    execFile("tar", ["-cf", outputTar, "-C", sourceDir, "."], (error, stdout, stderr) => {
      if (error) {
        reject(`tar error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(`tar stdout: ${stdout}`);
      }
      if (stderr) {
        console.error(`tar stderr: ${stderr}`);
      }
      resolve();
    });
  });
}

/**
 * Helper function to remove a directory recursively
 */
function removeDir(dirPath: string): void {
  if (existsSync(dirPath)) {
    const files = readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = join(dirPath, file.name);
      if (file.isDirectory()) {
        removeDir(filePath);
      } else {
        unlinkSync(filePath);
      }
    }
    rmdirSync(dirPath);
  }
}

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown,
  execFile: ExecFileFn = execFileOriginal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a temporary output directory for MinerU
    const outputDir = dirname(targetPath);
    const inputFileName = basename(filePath, `.${fileType}`);
    const mineruOutputDir = join(outputDir, `${inputFileName}_mineru_${convertTo}`);

    // Ensure output directory exists
    if (!existsSync(mineruOutputDir)) {
      mkdirSync(mineruOutputDir, { recursive: true });
    }

    // Build MinerU command arguments
    // MinerU CLI: magic-pdf -p <input> -o <output_dir> -m auto
    const args = ["-p", filePath, "-o", mineruOutputDir, "-m", "auto"];

    // Add table mode option if md-i (render tables as images)
    if (convertTo === "md-i") {
      args.push("--table-mode", "image");
    } else {
      args.push("--table-mode", "markdown");
    }

    execFile("mineru", args, async (error, stdout, stderr) => {
      if (error) {
        reject(`mineru error: ${error}`);
        return;
      }

      if (stdout) {
        console.log(`mineru stdout: ${stdout}`);
      }

      if (stderr) {
        console.error(`mineru stderr: ${stderr}`);
      }

      try {
        // MinerU outputs to a subdirectory, find the actual output
        const mineruActualOutput = join(mineruOutputDir, "auto");

        // Create .tar archive from the output directory (不使用壓縮)
        // 強制使用 .tar 格式，禁止 .tar.gz
        const tarPath = getArchiveFileName(targetPath);

        // Ensure the parent directory exists
        const tarDir = dirname(tarPath);
        if (!existsSync(tarDir)) {
          mkdirSync(tarDir, { recursive: true });
        }

        // Use the actual MinerU output directory for archiving
        const outputToArchive = existsSync(mineruActualOutput)
          ? mineruActualOutput
          : mineruOutputDir;

        await createTarArchive(outputToArchive, tarPath, execFile);

        // Clean up the temporary directory
        removeDir(mineruOutputDir);

        resolve("Done");
      } catch (tarError) {
        reject(`Failed to create .tar archive: ${tarError}`);
      }
    });
  });
}
