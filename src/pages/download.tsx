import { Elysia } from "elysia";
import sanitize from "sanitize-filename";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { getStorage } from "../storage/index";

export const download = new Elysia()
  .use(userService)
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, redirect, user }) => {
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }
      
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const fileRow = db
        .query(`
          SELECT storage_key FROM file_names
          WHERE job_id = ? AND file_name = ?
        `,
      )
      .get(params.jobId, fileName) as { storage_key: string } | undefined;

      if (!fileRow) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      const storage = getStorage();
      const fileBuffer = await storage.get(fileRow.storage_key);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    },
    {
      auth: true,
    },
  );
