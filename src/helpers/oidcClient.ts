import * as client from "openid-client";
import { OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ENABLED, OIDC_ISSUER } from "./env";

export let oidcConfig: Awaited<ReturnType<typeof client.discovery>> | undefined;

const RETRY_DELAY_MS = 30_000;

async function discoverOidc() {
  try {
    oidcConfig = await client.discovery(new URL(OIDC_ISSUER), OIDC_CLIENT_ID, OIDC_CLIENT_SECRET);
    console.log("OIDC: discovered issuer", OIDC_ISSUER);
  } catch (error) {
    console.error(
      `OIDC: failed to discover issuer, SSO login will be unavailable until this succeeds (retrying in ${RETRY_DELAY_MS / 1000}s):`,
      error,
    );
    setTimeout(discoverOidc, RETRY_DELAY_MS);
  }
}

if (OIDC_ENABLED) {
  // Deliberately not awaited: a slow/unreachable issuer must not delay the
  // server binding its port (discovery's own default timeout is 30s, which
  // would otherwise stall every deployment's startup and health checks, even
  // ones not currently relying on OIDC). isOidcReady() reflects completion,
  // and the retry loop recovers automatically from transient IdP outages
  // without requiring a container restart.
  void discoverOidc();
}

// OIDC_ENABLED only reflects that the env vars are set; this reflects whether
// discovery actually succeeded, i.e. whether the login button should be usable.
export function isOidcReady() {
  return oidcConfig !== undefined;
}
