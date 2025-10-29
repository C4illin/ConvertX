import { rmSync } from "node:fs";
import { Elysia } from "elysia";
import { outputDir, uploadsDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";
import { Jobs } from "../db/types";

export const deleteJob = new Elysia().use(userService).get(
  "/delete/:userId/:jobId",
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
);
