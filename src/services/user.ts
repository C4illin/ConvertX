import { randomUUID } from "node:crypto";

import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";

import { SSO_ENABLED, WEBROOT } from "../helpers/env";
import { isHtmlPageRequest } from "../helpers/isHtmlPageRequest";
import { ensureSsoUser, resolveSsoIdentity } from "../helpers/sso";

export const userService = new Elysia({ name: "user/service" })
  .use(
    jwt({
      name: "jwt",
      schema: t.Object({
        id: t.String(),
      }),
      secret: process.env.JWT_SECRET ?? randomUUID(),
      exp: "7d",
    }),
  )
  .model({
    signIn: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    session: t.Cookie({
      auth: t.String(),
      jobId: t.Optional(t.String()),
    }),
    optionalSession: t.Cookie({
      auth: t.Optional(t.String()),
      jobId: t.Optional(t.String()),
    }),
  })
  .onBeforeHandle({ as: "global" }, ({ request, set }) => {
    // In SSO mode the identity comes from the proxy header, not from a
    // sameSite cookie, so the cookie no longer provides CSRF protection.
    // Reject state-changing requests that a browser marks as cross-site.
    if (!SSO_ENABLED) {
      return;
    }

    const method = request.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return;
    }

    if (request.headers.get("sec-fetch-site") === "cross-site") {
      set.status = 403;
      return "Forbidden";
    }

    const origin = request.headers.get("origin");
    if (!origin) {
      // Non-browser clients (curl, integrations) send no Origin.
      return;
    }

    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      set.status = 403;
      return "Forbidden";
    }

    if (originHost !== (request.headers.get("host") ?? new URL(request.url).host)) {
      set.status = 403;
      return "Forbidden";
    }
  })
  .macro("auth", {
    cookie: "optionalSession",
    async resolve({ request, set, status, jwt, cookie: { auth } }) {
      const unauthorized = () => {
        // In SSO mode there is no login page to redirect to: the reverse proxy
        // owns authentication, so a request without an identity is simply
        // unauthorised. Redirecting would land on a disabled route.
        if (!SSO_ENABLED && isHtmlPageRequest(request)) {
          set.headers.location = `${WEBROOT}/login`;
          return status(302, {
            success: false,
            message: "Redirecting to login",
          });
        }

        return status(401, {
          success: false,
          message: "Unauthorized",
        });
      };

      if (SSO_ENABLED) {
        const identity = resolveSsoIdentity(request.headers);
        if (!identity) {
          // No cookie fallback: a valid JWT is not an identity in SSO mode.
          return unauthorized();
        }

        const userId = await ensureSsoUser(identity);
        return {
          success: true,
          user: { id: String(userId) },
        };
      }

      if (!auth.value) {
        return unauthorized();
      }
      const user = await jwt.verify(auth.value);
      if (!user) {
        auth.remove();
        return unauthorized();
      }
      return {
        success: true,
        user,
      };
    },
  });
