import { Elysia, t } from "elysia";
import { userService } from "../../pages/user";
import db from "../../db/db";
import { User } from "../../db/types";
import { ACCOUNT_REGISTRATION, ALLOW_UNAUTHENTICATED } from "../../helpers/env";

export const auth = new Elysia({ prefix: "/auth" })
  .use(userService)
  .post(
    "/login",
    async ({ body: { email, password }, jwt, cookie: { auth }, set }) => {
      const user = db
        .query("SELECT * FROM users WHERE email = ?")
        .as(User)
        .get(email);

      if (!user) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      const isPasswordValid = await Bun.password.verify(password, user.password);
      if (!isPasswordValid) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      const token = await jwt.sign({ id: user.id.toString() });
      
      // Set cookie for web UI compatibility
      auth?.set({
        value: token,
        httpOnly: true,
        maxAge: 7 * 86400, // 7 days
        path: "/",
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
          },
          expiresIn: "7d",
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
      detail: {
        tags: ["auth"],
        summary: "Login to get JWT token",
        description: "Authenticate with email and password to receive a JWT token",
        responses: {
          200: {
            description: "Successful login",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "number" },
                            email: { type: "string" },
                          },
                        },
                        expiresIn: { type: "string", example: "7d" },
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
  .post(
    "/register",
    async ({ body: { email, password }, jwt, cookie: { auth }, set }) => {
      if (!ACCOUNT_REGISTRATION) {
        set.status = 403;
        return {
          success: false,
          error: "Registration is disabled",
          code: "REGISTRATION_DISABLED",
        };
      }

      // Check if user already exists
      const existingUser = db
        .query("SELECT id FROM users WHERE email = ?")
        .get(email);

      if (existingUser) {
        set.status = 409;
        return {
          success: false,
          error: "Email already registered",
          code: "EMAIL_EXISTS",
        };
      }

      // Hash password and create user
      const hashedPassword = await Bun.password.hash(password);
      const result = db
        .query("INSERT INTO users (email, password) VALUES (?, ?) RETURNING id, email")
        .as(User)
        .get(email, hashedPassword);

      if (!result) {
        set.status = 500;
        return {
          success: false,
          error: "Failed to create user",
          code: "CREATION_FAILED",
        };
      }

      const token = await jwt.sign({ id: result.id.toString() });
      
      // Set cookie for web UI compatibility
      auth?.set({
        value: token,
        httpOnly: true,
        maxAge: 7 * 86400, // 7 days
        path: "/",
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: result.id,
            email: result.email,
          },
          expiresIn: "7d",
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
      detail: {
        tags: ["auth"],
        summary: "Register a new account",
        description: "Create a new user account (if registration is enabled)",
        responses: {
          200: {
            description: "Successful registration",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "number" },
                            email: { type: "string" },
                          },
                        },
                        expiresIn: { type: "string", example: "7d" },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: "Registration disabled",
          },
          409: {
            description: "Email already exists",
          },
        },
      },
    }
  )
  .get(
    "/me",
    async ({ jwt, cookie: { auth }, headers, set }) => {
      // Check for Bearer token in Authorization header
      const authHeader = headers.authorization;
      let token = auth?.value;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }

      if (!token) {
        set.status = 401;
        return {
          success: false,
          error: "No authentication token provided",
          code: "NO_TOKEN",
        };
      }

      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid or expired token",
          code: "INVALID_TOKEN",
        };
      }

      const user = db
        .query("SELECT id, email FROM users WHERE id = ?")
        .as(User)
        .get(payload.id);

      if (!user) {
        set.status = 404;
        return {
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
        },
      };
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Get current user info",
        description: "Get information about the currently authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "number" },
                            email: { type: "string" },
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
  .post(
    "/logout",
    async ({ cookie: { auth } }) => {
      auth?.remove();
      
      return {
        success: true,
        data: {
          message: "Logged out successfully",
        },
      };
    },
    {
      detail: {
        tags: ["auth"],
        summary: "Logout",
        description: "Clear authentication cookie (for web UI)",
        responses: {
          200: {
            description: "Successful logout",
          },
        },
      },
    }
  );