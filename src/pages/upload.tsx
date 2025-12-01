import { Elysia, t } from "elysia";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { uploadsDir } from "../index";
import { userService } from "./user";
import sanitize from "sanitize-filename";

export const upload = new Elysia().use(userService).post(
  "/upload",
  async ({ body, redirect, user, cookie: { jobId } }) => {
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

    if (body?.file) {
      if (Array.isArray(body.file)) {
        for (const file of body.file) {
          const santizedFileName = sanitize(file.name)
          await Bun.write(`${userUploadsDir}${santizedFileName}`, file);
        }
      } else {
        const santizedFileName = sanitize(body.file["name"])
        await Bun.write(`${userUploadsDir}${santizedFileName}`, body.file);
      }
    }

    return {
      message: "Files uploaded successfully.",
    };
  },
  { body: t.Object({ file: t.Files() }), auth: true },
);
