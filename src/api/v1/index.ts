import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { API_ENABLED, API_PREFIX } from "../../helpers/env";
import { auth } from "./auth";
import { converters } from "./converters";
import { conversions } from "./conversions";
import { files } from "./files";
import { health } from "./health";
import { jobs } from "./jobs";
import { debug } from "./debug";

// Main API router
export const api = new Elysia({
  prefix: API_PREFIX || "/api/v1",
  name: "api/v1",
})
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
      exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "ConvertX API",
          version: "1.0.0",
          description: "File conversion API supporting 1000+ formats",
          contact: {
            name: "ConvertX Support",
            email: "support@convertx.local",
          },
        },
        tags: [
          { name: "auth", description: "Authentication endpoints" },
          { name: "converters", description: "List available converters" },
          { name: "conversions", description: "File conversion operations" },
          { name: "jobs", description: "Job management" },
          { name: "files", description: "File operations" },
          { name: "health", description: "Health check" },
        ],
        servers: [
          {
            url: "http://localhost:3110/api/v1",
            description: "Local development server",
          },
          {
            url: "https://convertx.example.com/api/v1",
            description: "Production server",
          },
        ],
        security: [
          {
            bearerAuth: [],
          },
          {
            apiKey: [],
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "JWT authentication token",
            },
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
              description: "API key for programmatic access",
            },
          },
          schemas: {
            Error: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                error: { type: "string", example: "Error message" },
                code: { type: "string", example: "ERROR_CODE" },
              },
              required: ["success", "error"],
            },
            Success: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { type: "object" },
              },
              required: ["success"],
            },
          },
          responses: {
            Unauthorized: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                  example: {
                    success: false,
                    error: "Unauthorized",
                    code: "UNAUTHORIZED",
                  },
                },
              },
            },
            NotFound: {
              description: "Resource not found",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                  example: {
                    success: false,
                    error: "Resource not found",
                    code: "NOT_FOUND",
                  },
                },
              },
            },
            BadRequest: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                  example: {
                    success: false,
                    error: "Invalid request parameters",
                    code: "BAD_REQUEST",
                  },
                },
              },
            },
            ServerError: {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                  example: {
                    success: false,
                    error: "Internal server error",
                    code: "INTERNAL_ERROR",
                  },
                },
              },
            },
          },
        },
      },
      path: "/swagger",
      exclude: ["/swagger", "/swagger/json"],
    })
  )
  .onError(({ code, error, set }) => {
    console.error(`API Error [${code}]:`, error);
    
    switch (code) {
      case "NOT_FOUND":
        set.status = 404;
        return {
          success: false,
          error: "Endpoint not found",
          code: "NOT_FOUND",
        };
      case "VALIDATION":
        set.status = 400;
        return {
          success: false,
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: error.message,
        };
      case "INTERNAL_SERVER_ERROR":
        set.status = 500;
        return {
          success: false,
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        };
      default:
        set.status = 500;
        return {
          success: false,
          error: "An unexpected error occurred",
          code: "UNKNOWN_ERROR",
        };
    }
  });

// Only mount API routes if API is enabled
if (API_ENABLED) {
  api
    .use(health)
    .use(auth)
    .use(converters)
    .use(conversions)
    .use(jobs)
    .use(files)
    .use(debug);
}