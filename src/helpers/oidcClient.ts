import * as client from "openid-client";
import { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ENABLED, OIDC_ISSUER } from "./env";

export let oidcConfig: Awaited<ReturnType<typeof client.discovery>> | undefined;

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

// OIDC_ENABLED only reflects that the env vars are set; this reflects whether
// discovery actually succeeded, i.e. whether the login button should be usable.
export function isOidcReady() {
  return oidcConfig !== undefined;
}
