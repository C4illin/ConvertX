import { Elysia } from "elysia";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import sanitize from "sanitize-filename";
import * as tar from "tar";
import db from "../db/db";
import { outputDir, WEBROOT } from "../helpers/env";
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
      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));

      const jobOutputDir = path.join(outputDir, userId, jobId);
      const filePath = path.join(jobOutputDir, fileName);

      try {
        const stat = await lstat(filePath);
        if (stat.isSymbolicLink()) {
          set.status = 403;
          return { message: "Access denied." };
        }

        const resolvedBase = await realpath(jobOutputDir);
        const resolvedFile = await realpath(filePath);
        if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
          set.status = 403;
          return { message: "Access denied." };
        }
      } catch {
        set.status = 404;
        return { message: "Converted file not found." };
      }

      const file = Bun.file(filePath);
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
      const outputPath = path.join(outputDir, userId, jobId);
      const outputTar = path.join(outputPath, `converted_files_${jobId}.tar`);

      await tar.create(
        {
          file: outputTar,
          cwd: outputPath,
          filter: (entryPath, stat) => {
            const isSymlink =
              ("isSymbolicLink" in stat &&
                typeof stat.isSymbolicLink === "function" &&
                stat.isSymbolicLink()) ||
              ("type" in stat && (stat as { type?: string }).type === "SymbolicLink");
            if (entryPath.endsWith(".tar") || isSymlink) {
              return false;
            }
            return true;
          },
        },
        ["."],
      );
      return Bun.file(outputTar);
    },
    {
      auth: true,
    },
  );
