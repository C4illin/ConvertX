import { Elysia, t } from "elysia";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import sanitize from "sanitize-filename";
import { getStorage } from "../storage";
import crypto from "node:crypto";

export const upload = new Elysia().use(userService).post(
  "/upload",
  async ({ body, redirect, user, cookie: { jobId } }) => {
    if (!jobId?.value) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const jobIdValue = jobId.value;

    const existingJob = await db
      .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .get(jobId.value, user.id);

    if (!existingJob) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const storage = getStorage();

    const saveFile = async (file: File) => {
      const sanitizedFileName = sanitize(file.name);
      const storageKey = `${user.id}/${jobId.value}/${crypto.randomUUID()}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await storage.save(storageKey, buffer);

      db.query(
        `
        INSERT INTO file_names (job_id, file_name, storage_key)
        VALUES (?, ?, ?)
        `,
      ).run(jobIdValue, sanitizedFileName, storageKey);
    };

    if (body?.file) {
      if (Array.isArray(body.file)) {
        for (const file of body.file) {
          await saveFile(file);
        }
      } else {
        await saveFile(body.file);
      }
    }

    return {
      message: "Files uploaded successfully.",
    };
  },
  { body: t.Object({ file: t.Files() }), auth: true },
);
