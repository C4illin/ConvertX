import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import db from "../../db/db";
import { Jobs } from "../../db/types";
import { handleConvert } from "../../converters/main";
import { authMiddleware } from "../middleware/auth";
import { outputDir, uploadsDir } from "../../index";
import { ALLOW_UNAUTHENTICATED } from "../../helpers/env";

export const conversions = new Elysia({ prefix: "/conversions" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, set, ...ctx }: any) => {
      const user = (ctx as any).user;
      if (!user && !ALLOW_UNAUTHENTICATED) {
        set.status = 401;
        return {
          success: false,
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        };
      }

      const userId = user?.id || 0;
      const jobId = randomUUID();
      
      // Validate inputs
      if (!body.files || body.files.length === 0) {
        set.status = 400;
        return {
          success: false,
          error: "No files provided",
          code: "NO_FILES",
        };
      }

      if (!body.converter || !body.outputFormat) {
        set.status = 400;
        return {
          success: false,
          error: "Converter and output format are required",
          code: "MISSING_PARAMS",
        };
      }

      // Create directories
      const userUploadsDir = `${uploadsDir}${userId}/${jobId}/`;
      const userOutputDir = `${outputDir}${userId}/${jobId}/`;
      
      await mkdir(userUploadsDir, { recursive: true });
      await mkdir(userOutputDir, { recursive: true });

      // Create job in database
      db.query("INSERT INTO jobs (id, user_id, date_created, status, num_files) VALUES (?, ?, ?, ?, ?)")
        .run(jobId, userId, new Date().toISOString(), "processing", body.files.length);

      // TODO: Handle file uploads or URLs
      // For now, assume files are already uploaded
      const fileNames = body.files.map(f => f.name);

      // Start conversion asynchronously
      handleConvert(
        fileNames,
        userUploadsDir,
        userOutputDir,
        body.outputFormat,
        body.converter,
        { value: jobId }
      ).then(() => {
        db.query("UPDATE jobs SET status = ? WHERE id = ?").run("completed", jobId);
      }).catch((error) => {
        console.error("Conversion error:", error);
        db.query("UPDATE jobs SET status = ? WHERE id = ?").run("failed", jobId);
      });

      return {
        success: true,
        data: {
          jobId,
          status: "processing",
          message: "Conversion started",
          pollUrl: `/api/v1/jobs/${jobId}`,
        },
      };
    },
    {
      body: t.Object({
        files: t.Array(
          t.Object({
            name: t.String(),
            // Add more file properties as needed
          })
        ),
        converter: t.String(),
        outputFormat: t.String(),
        options: t.Optional(t.Object({})),
      }),
      detail: {
        tags: ["conversions"],
        summary: "Start a conversion job",
        description: "Upload files and start a conversion job",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "Conversion job started",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        jobId: { type: "string", format: "uuid" },
                        status: { type: "string", example: "processing" },
                        message: { type: "string" },
                        pollUrl: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    }
  );