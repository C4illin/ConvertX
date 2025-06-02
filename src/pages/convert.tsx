import { mkdir } from "node:fs/promises";
import { Elysia, t } from "elysia";
import sanitize from "sanitize-filename";
import { Jobs, outputDir, uploadsDir } from "..";
import { mainConverter } from "../converters/main";
import { WEBROOT } from "../helpers/env";
import db from "../db/db";
import {
  normalizeFiletype,
  normalizeOutputFiletype,
} from "../helpers/normalizeFiletype";
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

    const existingJob = db
      .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
      .as(Jobs)
      .get(jobId.value, user.id);

    if (!existingJob) {
      return redirect(`${WEBROOT}/`, 302);
    }

    const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;
    const userOutputDir = `${outputDir}${user.id}/${jobId.value}/`;

    // create the output directory
    try {
      await mkdir(userOutputDir, { recursive: true });
    } catch (error) {
      console.error(
        `Failed to create the output directory: ${userOutputDir}.`,
        error,
      );
    }

    const convertTo = normalizeFiletype(body.convert_to.split(",")[0] ?? "");
    const converterName = body.convert_to.split(",")[1];
    const fileNames = JSON.parse(body.file_names) as string[];

    for (let i = 0; i < fileNames.length; i++) {
      fileNames[i] = sanitize(fileNames[i] || "");
    }

    if (!Array.isArray(fileNames) || fileNames.length === 0) {
      return redirect(`${WEBROOT}/`, 302);
    }

    db.query(
      "UPDATE jobs SET num_files = ?1, status = 'pending' WHERE id = ?2",
    ).run(fileNames.length, jobId.value);

    const query = db.query(
      "INSERT INTO file_names (job_id, file_name, output_file_name, status) VALUES (?1, ?2, ?3, ?4)",
    );

    // Start the conversion process in the background
    Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = `${userUploadsDir}${fileName}`;
        const fileTypeOrig = fileName.split(".").pop() ?? "";
        const fileType = normalizeFiletype(fileTypeOrig);
        const newFileExt = normalizeOutputFiletype(convertTo);
        const newFileName = fileName.replace(
          new RegExp(`${fileTypeOrig}(?!.*${fileTypeOrig})`),
          newFileExt,
        );
        const targetPath = `${userOutputDir}${newFileName}`;

        const result = await mainConverter(
          filePath,
          fileType,
          convertTo,
          targetPath,
          {},
          converterName,
        );
        if (jobId.value) {
          query.run(jobId.value, fileName, newFileName, result);
        }
      }),
    )
      .then(() => {
        // All conversions are done, update the job status to 'completed'
        if (jobId.value) {
          db.query("UPDATE jobs SET status = 'completed' WHERE id = ?1").run(
            jobId.value,
          );
        }

        // delete all uploaded files in userUploadsDir
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
  },
);
