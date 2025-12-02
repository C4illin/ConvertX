import { Elysia, t } from "elysia";
import db from "../db/db";
import { WEBROOT, CLAMAV_URL } from "../helpers/env";
import { uploadsDir } from "../index";
import { userService } from "./user";
import sanitize from "sanitize-filename";

type ClamAvResultItem = {
  name: string;
  is_infected: boolean;
  viruses: string[];
};

type ClamAvResponse = {
  success: boolean;
  data?: {
    result?: ClamAvResultItem[];
  };
};

/**
 * Send a file to ClamAV REST API (benzino77/clamav-rest-api).
 * Returns { infected: boolean, viruses: string[] } and logs everything.
 */
async function scanFileWithClamAV(file: any, fileName: string) {
  if (!CLAMAV_URL) {
    console.error("[ClamAV] CLAMAV_URL is not configured, skipping scan.");
    return {
      infected: false,
      viruses: [] as string[],
    };
  }

  const FormDataCtor = (globalThis as any).FormData as
    | (new () => { append: (name: string, value: any, fileName?: string) => void })
    | undefined;

  if (!FormDataCtor) {
    console.error("[ClamAV] FormData is not available in this runtime, skipping scan.");
    return {
      infected: false,
      viruses: [] as string[],
    };
  }

  console.log("[ClamAV] Scanning file:", fileName, "via", CLAMAV_URL);

  const formData = new FormDataCtor();
  formData.append("FILES", file, fileName);

  let rawText = "";
  let status = 0;

  try {
    const res = await fetch(CLAMAV_URL, {
      method: "POST",
      body: formData as any,
    });

    status = res.status;
    rawText = await res.text();
    console.log("[ClamAV] HTTP status:", status);
    console.log("[ClamAV] Raw response:", rawText);

    if (!res.ok) {
      console.error("[ClamAV] Non-OK response from ClamAV:", status, rawText);
      // fail-open: treat as clean if AV is misbehaving, to not block all uploads
      return {
        infected: false,
        viruses: [] as string[],
      };
    }
  } catch (error) {
    console.error("[ClamAV] Error sending request to ClamAV:", error);
    // fail-open
    return {
      infected: false,
      viruses: [] as string[],
    };
  }

  let json: ClamAvResponse | undefined;
  try {
    json = JSON.parse(rawText) as ClamAvResponse;
    console.log("[ClamAV] Parsed JSON:", json);
  } catch (error) {
    console.error("[ClamAV] Failed to parse JSON from ClamAV:", error);
    return {
      infected: false,
      viruses: [] as string[],
    };
  }

  const result = json?.data?.result;
  if (!json?.success || !Array.isArray(result)) {
    console.error("[ClamAV] Unexpected JSON structure from ClamAV.");
    return {
      infected: false,
      viruses: [] as string[],
    };
  }

  const infectedItems = result.filter((item) => item.is_infected);
  const viruses = infectedItems.flatMap((item) => item.viruses ?? []);

  if (infectedItems.length > 0) {
    console.warn(
      "[ClamAV] Infection detected for file:",
      fileName,
      "viruses:",
      viruses,
    );
    return {
      infected: true,
      viruses,
    };
  }

  console.log("[ClamAV] File is clean:", fileName);
  return {
    infected: false,
    viruses: [] as string[],
  };
}

export const upload = new Elysia()
  .use(userService)
  .post(
    "/upload",
    async ({ body, redirect, user, cookie: { jobId } }) => {
      // Ensure we have a valid job
      if (!jobId?.value) {
        console.warn("[Upload] Missing jobId cookie, redirecting to root.");
        return redirect(`${WEBROOT}/`, 302);
      }

      console.log("[Upload] Incoming upload for jobId:", jobId.value, "userId:", user.id);

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        console.warn(
          "[Upload] Job not found or does not belong to user. jobId:",
          jobId.value,
          "userId:",
          user.id,
        );
        return redirect(`${WEBROOT}/`, 302);
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;
      console.log("[Upload] Upload directory:", userUploadsDir);

      if (body?.file) {
        const files = Array.isArray(body.file) ? body.file : [body.file];

        const infectedFiles: { name: string; viruses: string[] }[] = [];

        for (const file of files) {
          const originalName = (file as any).name ?? "upload";
          const sanitizedFileName = sanitize(originalName) || "file";
          console.log("[Upload] Handling file:", originalName, "=> sanitized:", sanitizedFileName);

          // 1) Scan with ClamAV REST API (use original name just for logging / AV metadata)
          const scan = await scanFileWithClamAV(file, originalName);

          if (scan.infected) {
            infectedFiles.push({
              name: originalName,
              viruses: scan.viruses,
            });
            console.warn(
              "[Upload] File marked as infected, will NOT be saved:",
              originalName,
              "viruses:",
              scan.viruses,
            );
            // do NOT save infected file
            continue;
          }

          // 2) Only save if clean, with sanitized filename
          const targetPath = `${userUploadsDir}${sanitizedFileName}`;
          console.log("[Upload] Saving clean file to:", targetPath);
          await Bun.write(targetPath, file);
        }

        // ❗ If any infected file detected: tell frontend (status 200)
        if (infectedFiles.length > 0) {
          console.warn(
            "[Upload] One or more infected files detected, returning infected=true.",
            infectedFiles,
          );
          return {
            message: "Infected file found. Conversion will be aborted.",
            infected: true,
            infectedFiles,
          };
        }
      } else {
        console.warn("[Upload] No file found in request body.");
      }

      // Normal case: all files clean (or no files)
      console.log("[Upload] All files clean, upload successful for jobId:", jobId.value);
      return {
        message: "Files uploaded successfully.",
      };
    },
    {
      body: t.Object({
        file: t.Files(),
      }),
      auth: true,
    },
  );

