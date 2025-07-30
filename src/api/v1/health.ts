import { Elysia } from "elysia";
import db from "../../db/db";

export const health = new Elysia()
  .get(
    "/health",
    async () => {
      try {
        // Check database connection
        const dbCheck = db.query("SELECT 1").get();
        const dbHealthy = dbCheck !== null;

        // Check disk space (simplified check)
        const diskHealthy = true; // TODO: Implement actual disk space check

        // Check converter availability (simplified)
        const convertersHealthy = true; // TODO: Check if converters are installed

        const healthy = dbHealthy && diskHealthy && convertersHealthy;

        return {
          success: true,
          data: {
            status: healthy ? "healthy" : "unhealthy",
            timestamp: new Date().toISOString(),
            checks: {
              database: dbHealthy ? "ok" : "error",
              disk: diskHealthy ? "ok" : "error",
              converters: convertersHealthy ? "ok" : "error",
            },
            version: process.env.npm_package_version || "unknown",
          },
        };
      } catch (error) {
        return {
          success: false,
          data: {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          },
        };
      }
    },
    {
      detail: {
        tags: ["health"],
        summary: "Health check endpoint",
        description: "Check the health status of the API and its dependencies",
        responses: {
          200: {
            description: "Health status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", enum: ["healthy", "unhealthy"] },
                        timestamp: { type: "string", format: "date-time" },
                        checks: {
                          type: "object",
                          properties: {
                            database: { type: "string", enum: ["ok", "error"] },
                            disk: { type: "string", enum: ["ok", "error"] },
                            converters: { type: "string", enum: ["ok", "error"] },
                          },
                        },
                        version: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  );