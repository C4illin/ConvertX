import { rmSync } from "node:fs";
import { Elysia } from "elysia";
import { outputDir, uploadsDir } from "..";
import db from "../db/db";
import { WEBROOT } from "../helpers/env";
import { userService } from "./user";

export const deleteJob = new Elysia().use(userService).get(
  "/delete/:userId/:jobId",
  async ({ params, redirect, user }) => {
    const job = await db.job.findFirst({
      where: {
        userId: parseInt(user.id, 10),
        id: parseInt(params.jobId, 10),
      },
    });

    if (!job) {
      return redirect(`${WEBROOT}/results`, 302);
    }

    // delete the directories
    rmSync(`${outputDir}${job.userId}/${job.id}`, {
      recursive: true,
      force: true,
    });
    rmSync(`${uploadsDir}${job.userId}/${job.id}`, {
      recursive: true,
      force: true,
    });

    // delete the job
    await db.job.delete({
      where: { id: job.id },
    });
    return redirect(`${WEBROOT}/history`, 302);
  },
  {
    auth: true,
  },
);
