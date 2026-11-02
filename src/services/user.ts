import { randomUUID } from "node:crypto";

import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";

import { HTTP_ALLOWED, SSO_ENABLED, WEBROOT } from "../helpers/env";
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
        if (identity) {
          await ensureSsoUser(identity);

          // Keep the session cookie in sync with the proxy identity, so the
          // next request of the same browser can be served from the JWT alone.
          const session = auth?.value ? await jwt.verify(auth.value) : false;
          const sameUser = session !== false && session.id === String(identity.id);
          if (auth && !sameUser) {
            auth.set({
              value: await jwt.sign({ id: String(identity.id) }),
              httpOnly: true,
              secure: !HTTP_ALLOWED,
              maxAge: 60 * 60 * 24 * 7,
              sameSite: "strict",
            });
          }

          return {
            success: true,
            user: { id: String(identity.id) },
          };
        }
        // No valid identity header: fall through to the cookie, so an existing
        // session keeps working if a request reaches the app without the proxy.
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
