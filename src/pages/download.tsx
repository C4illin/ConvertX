import { randomUUID } from "node:crypto";
import { rename, unlink } from "node:fs/promises";
import path from "node:path";

import { Elysia } from "elysia";
import sanitize from "sanitize-filename";

import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";

const archiveBuilds = new Map<string, Promise<void>>();

export const download = new Elysia()
  .use(userService)
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, redirect, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }
      // parse from URL encoded string
      const jobId = params.jobId;
      const fileName = sanitize(params.fileName);

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        set.status = 404;
        return { message: "Converted file not found." };
      }

      return file;
    },
    {
      auth: true,
    },
  )
  .get(
    "/archive/:jobId",
    async ({ params, redirect, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const jobId = decodeURIComponent(params.jobId);
      const outputPath = `${outputDir}${userId}/${jobId}`;
      const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`);

      const archiveKey = `${userId}/${jobId}`;
      let archiveBuild = archiveBuilds.get(archiveKey);
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
                files[file] = new Uint8Array(
                  await Bun.file(path.join(outputPath, file)).arrayBuffer(),
                );
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
          archiveBuilds.delete(archiveKey);
        });
        archiveBuilds.set(archiveKey, archiveBuild);
      }
      await archiveBuild;
      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
