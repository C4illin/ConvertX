import { Elysia, t } from "elysia";
import db from "../../db/db";
import { Jobs, Filename } from "../../db/types";
import { authMiddleware } from "../middleware/auth";
import { ALLOW_UNAUTHENTICATED } from "../../helpers/env";

export const jobs = new Elysia({ prefix: "/jobs" })
  .use(authMiddleware)
  .get(
    "/",
    ({ query, set, ...ctx }: any) => {
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
      const limit = query.limit || 20;
      const offset = query.offset || 0;

      const jobs = db
        .query("SELECT * FROM jobs WHERE user_id = ? ORDER BY date_created DESC LIMIT ? OFFSET ?")
        .as(Jobs)
        .all(userId, limit, offset);

      const total = db
        .query("SELECT COUNT(*) as count FROM jobs WHERE user_id = ?")
        .get(userId) as { count: number };

      return {
        success: true,
        data: {
          jobs: jobs.map(job => ({
            id: job.id,
            status: job.status,
            dateCreated: job.date_created,
            numFiles: job.num_files,
          })),
          pagination: {
            limit,
            offset,
            total: total.count,
          },
        },
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ["jobs"],
        summary: "List user's jobs",
        description: "Get a list of all conversion jobs for the authenticated user",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "List of jobs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        jobs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string", format: "uuid" },
                              status: { type: "string", enum: ["not started", "processing", "completed", "failed"] },
                              dateCreated: { type: "string", format: "date-time" },
                              numFiles: { type: "number" },
                            },
                          },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            limit: { type: "number" },
                            offset: { type: "number" },
                            total: { type: "number" },
                          },
                        },
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
        },
      },
    }
  )
  .get(
    "/:id",
    ({ params: { id }, set, ...ctx }: any) => {
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

      const job = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(id, userId);

      if (!job) {
        set.status = 404;
        return {
          success: false,
          error: "Job not found",
          code: "JOB_NOT_FOUND",
        };
      }

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(id);

      return {
        success: true,
        data: {
          job: {
            id: job.id,
            status: job.status,
            dateCreated: job.date_created,
            numFiles: job.num_files,
            files: files.map(file => ({
              id: file.id,
              fileName: file.file_name,
              outputFileName: file.output_file_name,
              status: file.status,
            })),
          },
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["jobs"],
        summary: "Get job details",
        description: "Get detailed information about a specific job including file statuses",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "Job details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        job: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            status: { type: "string" },
                            dateCreated: { type: "string", format: "date-time" },
                            numFiles: { type: "number" },
                            files: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  id: { type: "number" },
                                  fileName: { type: "string" },
                                  outputFileName: { type: "string" },
                                  status: { type: "string" },
                                },
                              },
                            },
                          },
                        },
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
  )
  .delete(
    "/:id",
    ({ params: { id }, set, ...ctx }: any) => {
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

      const job = db
        .query("SELECT id FROM jobs WHERE id = ? AND user_id = ?")
        .get(id, userId);

      if (!job) {
        set.status = 404;
        return {
          success: false,
          error: "Job not found",
          code: "JOB_NOT_FOUND",
        };
      }

      // Delete files from database
      db.query("DELETE FROM file_names WHERE job_id = ?").run(id);
      
      // Delete job
      db.query("DELETE FROM jobs WHERE id = ?").run(id);

      // TODO: Delete actual files from disk

      return {
        success: true,
        data: {
          message: "Job deleted successfully",
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["jobs"],
        summary: "Delete a job",
        description: "Delete a job and all associated files",
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          200: {
            description: "Job deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string" },
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