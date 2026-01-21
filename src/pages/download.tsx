import { existsSync } from "node:fs";
import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { createJobArchive } from "../transfer";

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
      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;

      // 檢查檔案是否存在
      if (!existsSync(filePath)) {
        console.error(`[Download] File not found: ${filePath}`);
        set.status = 404;
        return { error: "File not found", path: filePath };
      }

      return Bun.file(filePath);
    },
    {
      auth: true,
    },
  )
  .get(
    "/archive/:jobId",
    async ({ params, redirect, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const jobId = decodeURIComponent(params.jobId);
      const outputPath = `${outputDir}${userId}/${jobId}`;

      // 檢查輸出目錄是否存在
      if (!existsSync(outputPath)) {
        console.error(`[Archive] Output directory not found: ${outputPath}`);
        set.status = 404;
        return { error: "Output directory not found", path: outputPath };
      }

      // 使用統一的封裝管理器建立 .tar（不壓縮）
      const outputTar = await createJobArchive(outputPath, jobId);

      // 檢查 archive 是否成功建立
      if (!existsSync(outputTar)) {
        console.error(`[Archive] Failed to create archive: ${outputTar}`);
        set.status = 500;
        return { error: "Failed to create archive", path: outputTar };
      }

      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
