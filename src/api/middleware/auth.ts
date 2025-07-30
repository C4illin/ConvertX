import { Elysia } from "elysia";
import { userService } from "../../pages/user";
import db from "../../db/db";
import { User } from "../../db/types";
import { ALLOW_UNAUTHENTICATED, API_KEY_ENABLED } from "../../helpers/env";

export const authMiddleware = new Elysia({ name: "api/auth-middleware" })
  .use(userService)
  .derive(async ({ jwt, cookie: { auth }, headers }) => {
    // Check for API key first
    if (API_KEY_ENABLED) {
      const apiKey = headers["x-api-key"];
      if (apiKey) {
        // TODO: Implement API key validation
        // For now, we'll skip to JWT auth
      }
    }

    // Check for Bearer token in Authorization header
    const authHeader = headers.authorization;
    let token = auth?.value;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // If no token and unauthenticated access is allowed, return user 0
    if (!token && ALLOW_UNAUTHENTICATED) {
      return {
        user: {
          id: 0,
          email: "anonymous@localhost",
        },
      };
    }

    if (!token) {
      return { user: null };
    }

    try {
      const payload = await jwt.verify(token);
      if (!payload || typeof payload !== 'object' || !('id' in payload)) {
        return { user: null };
      }

      const user = db
        .query("SELECT id, email FROM users WHERE id = ?")
        .as(User)
        .get(payload.id);

      return { user: user || null };
    } catch (error) {
      console.error("JWT verification error:", error);
      return { user: null };
    }
  });