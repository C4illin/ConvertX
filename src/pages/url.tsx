import { Elysia, t } from "elysia";
import { uploadsDir } from "..";
import db from "../db/db";
import { ALLOW_URL_UPLOAD, WEBROOT } from "../helpers/env";
import { getFilename } from "../helpers/getFilename";
import { isSafePath } from "../helpers/validatePath";
import { validateSafeUrl } from "../helpers/validateUrl";
import { userService } from "./user";

export const url = new Elysia().use(userService).post(
  "/url",
  async ({ body, redirect, user, cookie: { jobId }, set }) => {
    if (!ALLOW_URL_UPLOAD) {
      set.status = 403;
      throw new Error("URL upload is disabled");
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

    // 30 seconds timeout for the fetch operation
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 30_000);

    let currentUrl = body.url;
    let res: Response | null = null;
    let redirects = 0;

    try {
      while (redirects < 5) {
        await validateSafeUrl(currentUrl);

        res = await fetch(currentUrl, {
          signal: abortController.signal,
          redirect: "manual",
        });

        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const loc = res.headers.get("Location");
          if (!loc) break;
          currentUrl = new URL(loc, currentUrl).toString();
          redirects++;
          continue;
        }
        break;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!res || !res.ok) {
      throw new Error(`Failed to download URL, received ${res?.status || "unknown"}`);
    }

    const filename = getFilename(currentUrl, res.headers);
    const targetFilePath = `${userUploadsDir}${filename}`;
    if (!isSafePath(userUploadsDir, targetFilePath)) {
      throw new Error("Unsafe filename");
    }

    const fileSizeBytes = await Bun.write(targetFilePath, await res.blob());

    return {
      message: "Files downloaded successfully.",
      filename,
      fileSizeBytes,
    };
  },
  { body: t.Object({ url: t.String() }), auth: true },
);
