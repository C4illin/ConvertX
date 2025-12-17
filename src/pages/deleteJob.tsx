import { rmSync } from "node:fs";
import { Elysia, t } from "elysia";
import { outputDir, uploadsDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { Jobs } from "../db/types";

export const deleteJob = new Elysia()
  .use(userService)
  .get(
    "/delete/:jobId",
    async ({ params, redirect, user }) => {
      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      // delete the directories
      rmSync(`${outputDir}${job.user_id}/${job.id}`, {
        recursive: true,
        force: true,
      });
      rmSync(`${uploadsDir}${job.user_id}/${job.id}`, {
        recursive: true,
        force: true,
      });

      // delete the job
      db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
      return redirect(`${WEBROOT}/history`, 302);
    },
    {
      auth: true,
    },
  )
  .post(
    "/delete-multiple",
    async ({ body, user, set }) => {
      const { jobIds } = body;

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        set.status = 400;
        return { success: false, message: "Invalid job IDs provided" };
      }

      const results = {
        success: [] as string[],
        failed: [] as { jobId: string; error: string }[],
      };

      // Process deletions sequentially for safety
      for (const jobId of jobIds) {
        try {
          const job = db
            .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
            .as(Jobs)
            .get(user.id, jobId);

          if (!job) {
            results.failed.push({
              jobId,
              error: "Job not found or unauthorized",
            });
            continue;
          }

          // Delete the directories
          try {
            rmSync(`${outputDir}${job.user_id}/${job.id}`, {
              recursive: true,
              force: true,
            });
          } catch (error) {
            console.error(`Failed to delete output directory for job ${jobId}:`, error);
          }

          try {
            rmSync(`${uploadsDir}${job.user_id}/${job.id}`, {
              recursive: true,
              force: true,
            });
          } catch (error) {
            console.error(`Failed to delete uploads directory for job ${jobId}:`, error);
          }

          // Delete the job from database
          db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
          results.success.push(jobId);
        } catch (error) {
          results.failed.push({
            jobId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: results.failed.length === 0,
        deleted: results.success.length,
        failed: results.failed.length,
        details: results,
      };
    },
    {
      auth: true,
      body: t.Object({
        jobIds: t.Array(t.String()),
      }),
    },
  );
