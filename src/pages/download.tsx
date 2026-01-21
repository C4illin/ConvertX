import path from "node:path";
import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { createJobArchive, shouldUseChunkedDownload } from "../transfer";

export const download = new Elysia()
  .use(userService)
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, redirect, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }
      // parse from URL encoded string
      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      return Bun.file(filePath);
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
      
      // 使用統一的封裝管理器建立 .tar（不壓縮）
      const outputTar = await createJobArchive(outputPath, jobId);
      
      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
