import { execFile as execFileOriginal } from "node:child_process";
import { mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { ExecFileFn } from "./types";

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
 * Helper function to create a ZIP archive from a directory
 */
function createZipArchive(
  sourceDir: string,
  outputZip: string,
  execFile: ExecFileFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use zip command to create archive
    execFile(
      "zip",
      ["-r", outputZip, "."],
      (error, stdout, stderr) => {
        if (error) {
          reject(`zip error: ${error}`);
          return;
        }
        if (stdout) {
          console.log(`zip stdout: ${stdout}`);
        }
        if (stderr) {
          console.error(`zip stderr: ${stderr}`);
        }
        resolve();
      },
      { cwd: sourceDir },
    );
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
    // Determine mode based on target format
    // md-t = table mode (tables as markdown)
    // md-i = image mode (tables as images)
    const tableMode = convertTo === "md-t" ? "latex" : "html";

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
    const args = [
      "-p",
      filePath,
      "-o",
      mineruOutputDir,
      "-m",
      "auto",
    ];

    // Add table mode option if md-i (render tables as images)
    if (convertTo === "md-i") {
      args.push("--table-mode", "image");
    } else {
      args.push("--table-mode", "markdown");
    }

    execFile("magic-pdf", args, async (error, stdout, stderr) => {
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

        // Create ZIP archive from the output directory
        const zipPath = targetPath.endsWith(".zip")
          ? targetPath
          : `${targetPath}.zip`;

        // Ensure the parent directory exists
        const zipDir = dirname(zipPath);
        if (!existsSync(zipDir)) {
          mkdirSync(zipDir, { recursive: true });
        }

        // Use the actual MinerU output directory for zipping
        const outputToZip = existsSync(mineruActualOutput)
          ? mineruActualOutput
          : mineruOutputDir;

        await createZipArchive(outputToZip, zipPath, execFile);

        // Clean up the temporary directory
        removeDir(mineruOutputDir);

        resolve("Done");
      } catch (zipError) {
        reject(`Failed to create ZIP archive: ${zipError}`);
      }
    });
  });
}
