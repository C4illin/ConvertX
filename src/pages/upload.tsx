import { unlink } from "node:fs/promises";
import path from "node:path";

import { Elysia, t } from "elysia";

import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { resolveStoredFileNames, sanitizeFileName } from "../helpers/sanitizeFileName";
import { uploadsDir } from "../index";
import { userService } from "./user";

async function saveUploadedFiles(userUploadsDir: string, files: File[]): Promise<void> {
  const existingNames = await resolveStoredFileNames(
    userUploadsDir,
    files.map((file) => file.name),
  );
  for (const [i, file] of files.entries()) {
    const sanitizedFileName = sanitizeFileName(file.name);
    const existing = existingNames[i] ?? sanitizedFileName;
    if (existing !== sanitizedFileName && existing !== "") {
      try {
        await unlink(path.join(userUploadsDir, existing));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException | null)?.code;
        if (code !== "ENOENT" && code !== "ENOTDIR") {
          throw error;
        }
      }
    }
    await Bun.write(`${userUploadsDir}${sanitizedFileName}`, file);
  }
}

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
      const files = Array.isArray(body.file) ? body.file : [body.file];
      await saveUploadedFiles(userUploadsDir, files);
    }

    return {
      message: "Files uploaded successfully.",
    };
  },
  { body: t.Object({ file: t.Files() }), auth: true },
);
