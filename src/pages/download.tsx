import { Elysia } from "elysia";
import path from "node:path";
import * as tar from "tar";
import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { isSafePath } from "../helpers/validatePath";
import { userService } from "./user";

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
      const jobPath = `${outputDir}${userId}/${jobId}/`;
      const filePath = `${jobPath}${decodeURIComponent(params.fileName)}`;
      if (!isSafePath(jobPath, filePath)) {
        throw new Error("Unsafe filename");
      }

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
