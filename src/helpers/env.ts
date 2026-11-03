export const ACCOUNT_REGISTRATION =
  process.env.ACCOUNT_REGISTRATION?.toLowerCase() === "true" || false;

export const HTTP_ALLOWED = process.env.HTTP_ALLOWED?.toLowerCase() === "true" || false;

export const ALLOW_UNAUTHENTICATED =
  process.env.ALLOW_UNAUTHENTICATED?.toLowerCase() === "true" || false;

export const AUTO_DELETE_EVERY_N_HOURS = process.env.AUTO_DELETE_EVERY_N_HOURS
  ? Number(process.env.AUTO_DELETE_EVERY_N_HOURS)
  : 24;

export const HIDE_HISTORY = process.env.HIDE_HISTORY?.toLowerCase() === "true" || false;

export const BRANDING = process.env.BRANDING ?? "ConvertX";

export const WEBROOT = process.env.WEBROOT ?? "";

export const LANGUAGE = process.env.LANGUAGE?.toLowerCase() || "en";

export const MAX_CONVERT_PROCESS =
  process.env.MAX_CONVERT_PROCESS && Number(process.env.MAX_CONVERT_PROCESS) > 0
    ? Number(process.env.MAX_CONVERT_PROCESS)
    : 0;

export const UNAUTHENTICATED_USER_SHARING =
  process.env.UNAUTHENTICATED_USER_SHARING?.toLowerCase() === "true" || false;

export const TIMEZONE = process.env.TZ || undefined;

// Forward-auth / SSO. When enabled, the app takes the identity of a request
// from the header set by the reverse proxy instead of the login page.
export const SSO_ENABLED = process.env.SSO_ENABLED?.toLowerCase() === "true" || false;

// authentik's forward-auth outpost sets X-authentik-uid (a stable, salted
// hash of the user) and X-authentik-username.
//
// These values reach `Headers.get`, which throws on anything that is not a valid HTTP
// token: an empty string, a stray space, an `@`. A throw there is a 500 on every request
// rather than a fallback, so the name is validated once at load. `||`-style fallback rather
// than `??` because a variable set to "" must fall back, not survive as `""`.
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function headerName(value: string | undefined, fallback: string): string {
  const name = value?.trim() ?? "";
  if (HEADER_NAME.test(name)) {
    return name;
  }
  if (name !== "") {
    console.warn(`Ignoring an invalid header name (${JSON.stringify(name)}), using ${fallback}.`);
  }
  return fallback;
}

export const SSO_UID_HEADER = headerName(process.env.SSO_UID_HEADER, "x-authentik-uid");

export const SSO_USERNAME_HEADER = headerName(
  process.env.SSO_USERNAME_HEADER,
  "x-authentik-username",
);
