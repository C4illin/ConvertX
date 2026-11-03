import { randomUUID } from "node:crypto";
import { rename, unlink } from "node:fs/promises";
import path from "node:path";

const archiveBuilds = new Map<string, Promise<void>>();

/**
 * Writes `converted_files_<jobId>.tar` with every file in a job's output folder and returns its
 * path. Requests for a job whose archive is being built wait for that build instead of starting
 * another. Used by the web interface's archive download and by the API.
 */
export async function buildJobArchive(outputPath: string, jobId: string): Promise<string> {
  const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`);

  let archiveBuild = archiveBuilds.get(outputPath);
  if (!archiveBuild) {
    const build = async () => {
      const outputTarName = path.basename(outputTar);
      const outputTarTempName = `${outputTarName}.tmp-${randomUUID()}`;
      const outputTarTemp = path.join(outputPath, outputTarTempName);

      try {
        const files: Record<string, Uint8Array> = {};
        const glob = new Bun.Glob("**/*");
        for await (const file of glob.scan({ cwd: outputPath, onlyFiles: true, dot: true })) {
          if (file !== outputTarName && !file.startsWith(`${outputTarName}.tmp-`)) {
            files[file] = new Uint8Array(await Bun.file(path.join(outputPath, file)).arrayBuffer());
          }
        }
        await Bun.Archive.write(outputTarTemp, files);
        await rename(outputTarTemp, outputTar);
      } finally {
        if (await Bun.file(outputTarTemp).exists()) {
          await unlink(outputTarTemp);
        }
      }
    };

    archiveBuild = build().finally(() => {
      archiveBuilds.delete(outputPath);
    });
    archiveBuilds.set(outputPath, archiveBuild);
  }
  await archiveBuild;
  return outputTar;
}
