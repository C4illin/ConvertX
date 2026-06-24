import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { getStorage, getStorageType } from "../storage/index";
import { outputDir } from "..";
import path from "path";
import * as tar from "tar";

export const download = new Elysia()
  .use(userService)
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, redirect, user }) => {
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const fileName = sanitize(decodeURIComponent(params.fileName));

      const fileRow = db
        .query(
          `
          SELECT storage_key, file_name 
          FROM file_names
          WHERE job_id = ? AND file_name = ?
        `,
        )
        .get(params.jobId, fileName) as { storage_key?: string; file_name?: string } | undefined;
      if (!fileRow) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const storage = getStorage();
      const stream = storage.getStream(fileRow.storage_key!);

      return new Response(stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileRow.file_name ?? fileName}"`,
        },
      });
    },
    {
      auth: true,
    },
  )

  .get(
    "/archive/:jobId",
    async ({ params, redirect, user }) => {
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const storageType = getStorageType();
      if (storageType === "local") {
        const userId = user.id;
        const jobId = decodeURIComponent(params.jobId);
        const outputPath = `${outputDir}${userId}/${jobId}`;
        const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`);

        await tar.create(
          {
            file: outputTar,
            cwd: outputPath,
            filter: (path) => {
              return !path.match(".*\\.tar");
            },
          },
          ["."],
        );

        return Bun.file(outputTar);
      }

      return new Response(
        JSON.stringify({
          ok: false,
          message:
            "Archive download is not supported when object storage is enabled. This is intentional it avoid 404s - please use per-file downloads or request a follow-up for server-side archiving",
        }),
        {
          status: 501,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
    {
      auth: true,
    },
  );
