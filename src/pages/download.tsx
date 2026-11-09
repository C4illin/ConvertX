import { Elysia } from "elysia";
import sanitize from "sanitize-filename";

import { outputDir } from "..";
import db from "../db/db";
import { buildJobArchive } from "../helpers/buildJobArchive";
import { WEBROOT } from "../helpers/env";
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
      const outputTar = await buildJobArchive(`${outputDir}${userId}/${jobId}`, jobId);
      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
