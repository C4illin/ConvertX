import { unlink } from "node:fs/promises";
import path from "node:path";

import { Elysia, t } from "elysia";
import sanitize from "sanitize-filename";

import { uploadsDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";

export const deleteFile = new Elysia().use(userService).post(
  "/delete",
  async ({ body, redirect, set, cookie: { jobId }, user }) => {
    if (!jobId?.value) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const existingJob = await db
      .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId.value, user.id);

    if (!existingJob) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const userUploadsDir = path.join(uploadsDir, user.id, jobId.value);

    const sanitized = sanitize(body.filename);
    const targetPath = path.join(userUploadsDir, sanitized);

    try {
      await unlink(targetPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        set.status = 404;
        return { message: "File not found." };
      }
      throw e;
    }

    return {
      message: "File deleted successfully.",
    };
  },
  { body: t.Object({ filename: t.String() }), auth: true },
);
