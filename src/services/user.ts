import { randomUUID } from "node:crypto";

import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";

import { SSO_ENABLED, WEBROOT } from "../helpers/env";
import { isHtmlPageRequest } from "../helpers/isHtmlPageRequest";
import { ensureSsoUser, resolveSsoIdentity } from "../helpers/sso";

/**
 * Hostname and explicit port of a URL, for comparing an `Origin` against the host the request
 * arrived for. `URL` already lowercases the hostname and normalises a default port away
 * (`https://h:443` has `port === ""`), so the trailing root dot is all that is left to strip. The
 * scheme itself is compared separately, further down.
 */
function hostKey(url: URL): string {
  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  return url.port ? `${host}:${url.port}` : host;
}

/**
 * Routes that exist only for local accounts, plus the one POST that changes an account. Built once:
 * `WEBROOT` is fixed at boot and this is consulted on every request.
 */
const LOCAL_ONLY_PATHS = new Set(["/login", "/setup", "/register"]);

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
  .onRequest(({ request, set }) => {
    if (!SSO_ENABLED) {
      return;
    }

    // Short-circuit before body/cookie validation: in SSO mode these routes do
    // not exist, and a 422 about a form field or a session cookie the browser
    // never receives would be misleading. GET /account stays available.
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const root = WEBROOT.replace(/\/+$/, "");
    const localOnly = LOCAL_ONLY_PATHS.has(path.slice(root.length));
    const accountPost = request.method.toUpperCase() === "POST" && path === `${root}/account`;

    if (localOnly || accountPost) {
      set.status = 404;
      return "Not found";
    }
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

    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      set.status = 403;
      return "Forbidden";
    }

    // Behind the proxy, Host is the public host; a proxy that rewrites it can
    // send the original in X-Forwarded-Host. Compare hostnames case-insensitively
    // (URL lowercases them), ignore a trailing root dot, and normalise the port.
    // `||`, not `??`: a proxy that sends the header present-but-empty must fall
    // through to Host, otherwise the host is "" and `new URL("https://")` throws,
    // turning every state-changing request with an Origin into a 403.
    // A browser cannot forge X-Forwarded-Host on a cross-site form POST, and a
    // custom header on fetch() is preflighted, so this is not a way around the check.
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const hostHeader = forwardedHost || request.headers.get("host") || requestUrl.host;

    // Built from the Origin's own protocol on purpose: it keeps the implicit port
    // default (443 vs 80) comparable, so the check below is about the host.
    let targetUrl: URL;
    try {
      targetUrl = new URL(`${originUrl.protocol}//${hostHeader}`);
    } catch {
      set.status = 403;
      return "Forbidden";
    }

    if (hostKey(originUrl) !== hostKey(targetUrl)) {
      set.status = 403;
      return "Forbidden";
    }

    // The comparison above is host-only, so `Origin: http://<this host>` passes it.
    // That pair — plaintext origin, TLS deployment — is exactly what an open http
    // listener or a TLS-stripping proxy can forge, so reject a plaintext Origin when
    // the deployment says the request arrived over TLS. Behind a plain-HTTP proxy
    // that sets no X-Forwarded-Proto there is nothing to compare against, and the
    // hostname check is what stands.
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    const trustedProtocol =
      forwardedProto === "https" || forwardedProto === "http"
        ? `${forwardedProto}:`
        : requestUrl.protocol;

    if (trustedProtocol === "https:" && originUrl.protocol !== "https:") {
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
