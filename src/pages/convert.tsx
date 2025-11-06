import { mkdir } from "node:fs/promises";
import { Elysia, t } from "elysia";
import sanitize from "sanitize-filename";
import { outputDir, uploadsDir } from "..";
import { handleConvert } from "../converters/main";
import prisma from "../db/db";
import { WEBROOT } from "../helpers/env";
import { normalizeFiletype } from "../helpers/normalizeFiletype";
import { userService } from "./user";

export const convert = new Elysia().use(userService).post(
  "/convert",
  async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
    if (!auth?.value) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    if (!jobId?.value) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const parsedJobId = parseInt(jobId.value, 10);
    const parsedUserId = parseInt(user.id, 10);

    const existingJob = await prisma.job.findFirst({
      where: {
        id: parsedJobId,
        userId: parsedUserId,
      },
    });

    if (!existingJob) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;
    const userOutputDir = `${outputDir}${user.id}/${jobId.value}/`;

    // create the output directory
    try {
      await mkdir(userOutputDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create the output directory: ${userOutputDir}.`, error);
    }

    const convertTo = normalizeFiletype(body.convert_to.split(",")[0] ?? "");
    const converterName = body.convert_to.split(",")[1];

    if (!converterName) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const fileNames = JSON.parse(body.file_names) as string[];

    for (let i = 0; i < fileNames.length; i++) {
      fileNames[i] = sanitize(fileNames[i] || "");
    }

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return redirect(`${WEBROOT}/`, 302);
    }

    await prisma.job.update({
      where: { id: parsedJobId },
      data: {
        numFiles: fileNames.length,
        status: "pending",
      },
    });

    // Start the conversion process in the background
    handleConvert(fileNames, userUploadsDir, userOutputDir, convertTo, converterName, jobId)
      .then(async () => {
        // All conversions are done, update the job status to 'completed'
        if (jobId.value) {
          await prisma.job.update({
            where: { id: parsedJobId },
            data: { status: "completed" },
          });
        }

        // Delete all uploaded files in userUploadsDir
        // rmSync(userUploadsDir, { recursive: true, force: true });
      })
      .catch((error) => {
        console.error("Error in conversion process:", error);
      });

    // Redirect the client immediately
    return redirect(`${WEBROOT}/results/${jobId.value}`, 302);
  },
  {
    body: t.Object({
      convert_to: t.String(),
      file_names: t.String(),
    }),
    auth: true,
  },
);
