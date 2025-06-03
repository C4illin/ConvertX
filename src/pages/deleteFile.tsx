import { Elysia, t } from "elysia";
import { userService } from "./user";
import { unlink } from "node:fs/promises";
import { WEBROOT } from "../helpers/env";
import { uploadsDir } from "..";
import db from "../db/db";

export const deleteFile = new Elysia()
  .use(userService)
  .post(
    "/delete",
    async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (!jobId?.value) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

      await unlink(`${userUploadsDir}${body.filename}`);
    },
    { body: t.Object({ filename: t.String() }) },
  )