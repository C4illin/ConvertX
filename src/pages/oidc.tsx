import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import * as client from "openid-client";
import db from "../db/db";
import { User } from "../db/types";
import {
  HTTP_ALLOWED,
  OIDC_ISSUER,
  OIDC_REDIRECT_URI,
  OIDC_SCOPES,
  WEBROOT,
} from "../helpers/env";
import { oidcConfig } from "../helpers/oidcClient";
import { markFirstRunComplete, userService } from "./user";

const flowCookiePath = `${WEBROOT}/login/oidc`;

// PKCE verifier/state/nonce are all base64url (oauth4webapi's randomBytes()),
// so "." can never appear in a value and is safe as a delimiter here. This
// also avoids Elysia's cookie parser, which auto-JSON.parses any cookie value
// that looks like `{...}`/`[...]` - a JSON-encoded cookie here would get
// silently turned into an object before the route's `t.String()` schema ever
// saw it, failing validation before the handler even runs.
function parseFlowCookie(value: string): { code_verifier: string; state: string; nonce: string } | null {
  const parts = value.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }
  const [code_verifier, state, nonce] = parts as [string, string, string];
  return { code_verifier, state, nonce };
}

export const oidc = new Elysia().use(userService).get(
  "/login/oidc",
  async ({ redirect, cookie: { oidcFlow } }) => {
    if (!oidcConfig) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    const code_verifier = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    oidcFlow.set({
      value: `${code_verifier}.${state}.${nonce}`,
      httpOnly: true,
      secure: !HTTP_ALLOWED,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: flowCookiePath,
    });

    const redirectTo = client.buildAuthorizationUrl(oidcConfig, {
      redirect_uri: OIDC_REDIRECT_URI,
      scope: OIDC_SCOPES,
      code_challenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });

    return redirect(redirectTo.href, 302);
  },
  {
    cookie: t.Cookie({
      oidcFlow: t.Optional(t.String()),
    }),
  },
).get(
  "/login/oidc/callback",
  async ({ request, redirect, jwt, cookie: { auth, oidcFlow } }) => {
    if (!oidcConfig || !oidcFlow?.value) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    const flow = parseFlowCookie(oidcFlow.value);
    oidcFlow.path = flowCookiePath;
    oidcFlow.remove();

    if (!flow) {
      console.error("OIDC: malformed oidcFlow cookie");
      return redirect(`${WEBROOT}/login`, 302);
    }
    const { code_verifier, state, nonce } = flow;

    let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
    try {
      tokens = await client.authorizationCodeGrant(oidcConfig, new URL(request.url), {
        pkceCodeVerifier: code_verifier,
        expectedState: state,
        expectedNonce: nonce,
      });
    } catch (error) {
      console.error("OIDC: callback/token exchange failed:", error);
      return redirect(`${WEBROOT}/login`, 302);
    }

    const claims = tokens.claims();
    if (!claims?.sub) {
      console.error("OIDC: no subject claim in ID token");
      return redirect(`${WEBROOT}/login`, 302);
    }

    let email = typeof claims.email === "string" ? claims.email : undefined;
    let emailVerified = claims.email_verified === true;
    if (!email) {
      try {
        const userinfo = await client.fetchUserInfo(oidcConfig, tokens.access_token, claims.sub);
        email = typeof userinfo.email === "string" ? userinfo.email : undefined;
        emailVerified = userinfo.email_verified === true;
      } catch (error) {
        console.error("OIDC: failed to fetch userinfo:", error);
      }
    }

    if (!email) {
      console.error("OIDC: identity provider did not return an email claim");
      return redirect(`${WEBROOT}/login`, 302);
    }

    // sub is only guaranteed unique within its issuer, so identity is the (issuer, sub) pair.
    let user = db
      .query("SELECT * FROM users WHERE oidc_issuer = ? AND oidc_sub = ?")
      .as(User)
      .get(OIDC_ISSUER, claims.sub);

    if (!user) {
      // Only auto-link to an existing local account when the provider has
      // positively verified the email - otherwise an unverified/attacker-set
      // email claim could hijack an existing account.
      if (emailVerified) {
        const existingByEmail = db.query("SELECT * FROM users WHERE email = ?").as(User).get(email);
        if (existingByEmail) {
          db.query("UPDATE users SET oidc_sub = ?, oidc_issuer = ? WHERE id = ?").run(
            claims.sub,
            OIDC_ISSUER,
            existingByEmail.id,
          );
          user = existingByEmail;
        }
      }

      if (!user) {
        const isFirstUser = db.query("SELECT * FROM users").get() === null;
        // Local password login stays disabled for SSO-provisioned accounts;
        // this hash is never revealed and the field is only NOT NULL for schema reasons.
        const unusablePassword = await Bun.password.hash(randomUUID());
        // ON CONFLICT guards against two concurrent first-logins for the same
        // new identity both passing the SELECT above and racing to insert.
        db.query(
          `INSERT INTO users (email, password, oidc_sub, oidc_issuer)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(oidc_issuer, oidc_sub) DO NOTHING`,
        ).run(email, unusablePassword, claims.sub, OIDC_ISSUER);
        user = db
          .query("SELECT * FROM users WHERE oidc_issuer = ? AND oidc_sub = ?")
          .as(User)
          .get(OIDC_ISSUER, claims.sub);

        if (isFirstUser && user) {
          markFirstRunComplete();
        }
      }
    }

    if (!user) {
      console.error("OIDC: failed to provision local user record");
      return redirect(`${WEBROOT}/login`, 302);
    }

    const accessToken = await jwt.sign({ id: String(user.id) });

    if (!auth) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    auth.set({
      value: accessToken,
      httpOnly: true,
      secure: !HTTP_ALLOWED,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "strict",
    });

    return redirect(`${WEBROOT}/`, 302);
  },
  {
    cookie: t.Cookie({
      auth: t.Optional(t.String()),
      oidcFlow: t.Optional(t.String()),
    }),
  },
);
