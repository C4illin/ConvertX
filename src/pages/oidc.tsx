import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import * as client from "openid-client";
import db from "../db/db";
import { User } from "../db/types";
import {
  HTTP_ALLOWED,
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_ENABLED,
  OIDC_ISSUER,
  OIDC_REDIRECT_URI,
  OIDC_SCOPES,
  WEBROOT,
} from "../helpers/env";
import { markFirstRunComplete, userService } from "./user";

let oidcConfig: Awaited<ReturnType<typeof client.discovery>> | undefined;

if (OIDC_ENABLED) {
  try {
    oidcConfig = await client.discovery(
      new URL(OIDC_ISSUER),
      OIDC_CLIENT_ID,
      OIDC_CLIENT_SECRET,
    );
    console.log("OIDC: discovered issuer", OIDC_ISSUER);
  } catch (error) {
    console.error("OIDC: failed to discover issuer, SSO login will be unavailable:", error);
  }
}

const flowCookiePath = `${WEBROOT}/login/oidc`;

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
      value: JSON.stringify({ code_verifier, state, nonce }),
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

    const { code_verifier, state, nonce } = JSON.parse(oidcFlow.value) as {
      code_verifier: string;
      state: string;
      nonce: string;
    };
    oidcFlow.path = flowCookiePath;
    oidcFlow.remove();

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
    if (!email) {
      try {
        const userinfo = await client.fetchUserInfo(oidcConfig, tokens.access_token, claims.sub);
        email = typeof userinfo.email === "string" ? userinfo.email : undefined;
      } catch (error) {
        console.error("OIDC: failed to fetch userinfo:", error);
      }
    }

    if (!email) {
      console.error("OIDC: identity provider did not return an email claim");
      return redirect(`${WEBROOT}/login`, 302);
    }

    let user = db.query("SELECT * FROM users WHERE oidc_sub = ?").as(User).get(claims.sub);

    if (!user) {
      const existingByEmail = db.query("SELECT * FROM users WHERE email = ?").as(User).get(email);

      if (existingByEmail) {
        // Link the existing local account to this OIDC identity.
        db.query("UPDATE users SET oidc_sub = ? WHERE id = ?").run(claims.sub, existingByEmail.id);
        user = existingByEmail;
      } else {
        const isFirstUser = db.query("SELECT * FROM users").get() === null;
        // Local password login stays disabled for SSO-provisioned accounts;
        // this hash is never revealed and the field is only NOT NULL for schema reasons.
        const unusablePassword = await Bun.password.hash(randomUUID());
        db.query("INSERT INTO users (email, password, oidc_sub) VALUES (?, ?, ?)").run(
          email,
          unusablePassword,
          claims.sub,
        );
        user = db.query("SELECT * FROM users WHERE oidc_sub = ?").as(User).get(claims.sub);

        if (isFirstUser) {
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
