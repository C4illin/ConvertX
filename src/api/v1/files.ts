import { Elysia, t } from "elysia";
import { existsSync, createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import db from "../../db/db";
import { Jobs, Filename } from "../../db/types";
import { authMiddleware } from "../middleware/auth";
import { outputDir } from "../../index";
import { ALLOW_UNAUTHENTICATED } from "../../helpers/env";

export const files = new Elysia({ prefix: "/files" })
  .use(authMiddleware)
  .get(
    "/:jobId/:fileName",
    async ({ params: { jobId, fileName }, set, ...ctx }: any) => {
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

      // Verify job ownership
      const job = db
        .query("SELECT id FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId, userId);

      if (!job) {
        set.status = 404;
        return {
          success: false,
          error: "Job not found",
          code: "JOB_NOT_FOUND",
        };
      }

      // Verify file exists in database
      const file = db
        .query("SELECT * FROM file_names WHERE job_id = ? AND output_file_name = ?")
        .as(Filename)
        .get(jobId, fileName);

      if (!file) {
        set.status = 404;
        return {
          success: false,
          error: "File not found",
          code: "FILE_NOT_FOUND",
        };
      }

      // Check if file exists on disk
      const filePath = path.join(outputDir, String(userId), jobId, fileName);
      
      if (!existsSync(filePath)) {
        set.status = 404;
        return {
          success: false,
          error: "File not found on disk",
          code: "FILE_NOT_FOUND",
        };
      }

      // Get file stats
      const stats = await stat(filePath);
      
      // Set appropriate headers
      set.headers["content-type"] = getMimeType(fileName);
      set.headers["content-length"] = String(stats.size);
      set.headers["content-disposition"] = `attachment; filename="${fileName}"`;

      // Return file stream
      return new Response(Bun.file(filePath));
    },
    {
      params: t.Object({
        jobId: t.String(),
        fileName: t.String(),
      }),
      detail: {
        tags: ["files"],
        summary: "Download converted file",
        description: "Download a specific converted file from a job",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "File content",
            content: {
              "application/octet-stream": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    }
  )
  .get(
    "/:jobId",
    ({ params: { jobId }, set, ...ctx }: any) => {
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

      // Verify job ownership
      const job = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(jobId, userId);

      if (!job) {
        set.status = 404;
        return {
          success: false,
          error: "Job not found",
          code: "JOB_NOT_FOUND",
        };
      }

      // Get all files for this job
      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(jobId);

      const fileList = files.map(file => {
        const filePath = path.join(outputDir, String(userId), jobId, file.output_file_name);
        const exists = existsSync(filePath);
        
        return {
          id: file.id,
          fileName: file.file_name,
          outputFileName: file.output_file_name,
          status: file.status,
          exists,
          downloadUrl: exists ? `/api/v1/files/${jobId}/${file.output_file_name}` : null,
        };
      });

      return {
        success: true,
        data: {
          jobId,
          status: job.status,
          files: fileList,
          total: fileList.length,
        },
      };
    },
    {
      params: t.Object({
        jobId: t.String(),
      }),
      detail: {
        tags: ["files"],
        summary: "List job files",
        description: "Get a list of all files in a conversion job",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "List of files",
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
                        status: { type: "string" },
                        files: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "number" },
                              fileName: { type: "string" },
                              outputFileName: { type: "string" },
                              status: { type: "string" },
                              exists: { type: "boolean" },
                              downloadUrl: { type: "string", nullable: true },
                            },
                          },
                        },
                        total: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
          404: {
            $ref: "#/components/responses/NotFound",
          },
        },
      },
    }
  );

// Helper function to determine MIME type
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".zip": "application/zip",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
  };
  
  return mimeTypes[ext] || "application/octet-stream";
}