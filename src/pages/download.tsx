import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import { outputDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import path from "node:path";
import * as tar from "tar";

export const download = new Elysia()
  .use(userService)
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, jwt, redirect, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }
      // parse from url encoded string
      const userId = decodeURIComponent(params.userId);
      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      return Bun.file(filePath);
    },
  )
  .get("/archive/:userId/:jobId", async ({ params, jwt, redirect, cookie: { auth } }) => {
    if (!auth?.value) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    const job = await db
      .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
      .get(user.id, params.jobId);

    if (!job) {
      return redirect(`${WEBROOT}/results`, 302);
    }

    const userId = decodeURIComponent(params.userId);
    const jobId = decodeURIComponent(params.jobId);
    const outputPath = `${outputDir}${userId}/${jobId}`;
    const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`)

    await tar.create({file: outputTar, cwd: outputPath, filter: (path) => { return !path.match(".*\\.tar"); }}, ["."]);
    return Bun.file(outputTar);
  });
