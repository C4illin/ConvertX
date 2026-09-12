import { Elysia, t } from "elysia";
import { uploadsDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import sanitize from "sanitize-filename";
import { randomUUID } from "node:crypto";
import mime from "mime";

const getFilename = (url: string, headers: Headers) => {
  const contentDisposition = headers.get("Content-Disposition");
  if (contentDisposition) {
    const match = /filename="([^"]+)"/.exec(contentDisposition);
    if (match && match[1]) {
      return sanitize(match[1]);
    }
  }
  const path = new URL(url).pathname;
  const lastPart = path.split("/").at(-1);
  const contentType = headers.get("content-type");
  const extension = contentType ? mime.getExtension(contentType) : null;
  if (!lastPart) {
    if (extension) {
      return `${randomUUID()}.${extension}`;
    }
    return randomUUID();
  }
  if (!lastPart.includes(".") && extension) {
    return `${sanitize(lastPart)}.${extension}`;
  }
  return sanitize(lastPart);
};

export const url = new Elysia().use(userService).post(
  "/url",
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

    const res = await fetch(body.url);
    if (!res.ok) {
      throw new Error(`Failed to download URL, received ${res.status}`);
    }
    const filename = getFilename(body.url, res.headers);
    const fileSizeBytes = await Bun.write(`${userUploadsDir}${filename}`, await res.blob());

    return {
      message: "Files downloaded successfully.",
      filename,
      fileSizeBytes,
    };
  },
  { body: t.Object({ url: t.String() }), auth: true },
);
