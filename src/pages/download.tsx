import path from "node:path";
import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import * as tar from "tar";
import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";

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
      // parse from URL encoded string
      const userId = decodeURIComponent(params.userId);
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
    "/archive/:userId/:jobId",
    async ({ params, redirect, user }) => {
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const userId = decodeURIComponent(params.userId);
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
    },
    {
      auth: true,
    },
  );
