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
// token: a stray space, an `@`, a comma. So the name is validated once at load.
//
// Empty means "unset" and takes the default. Anything else that is not a valid header
// name is a configuration error and refuses to start: falling back would make the app
// trust the *default* header instead of the one the operator named, which in an auth path
// is worse than a container that will not boot — the operator sees the throw immediately,
// and a wrong identity source does not run quietly for weeks.
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function headerName(variable: string, fallback: string): string {
  const name = process.env[variable]?.trim() ?? "";
  if (name === "") {
    return fallback;
  }
  if (!HEADER_NAME.test(name)) {
    if (!SSO_ENABLED) {
      // Unused in this configuration; do not fail a local-login deployment over a stale var.
      return fallback;
    }
    throw new Error(`${variable} is not a valid HTTP header name: ${JSON.stringify(name)}`);
  }
  return name;
}

export const SSO_UID_HEADER = headerName("SSO_UID_HEADER", "x-authentik-uid");

export const SSO_USERNAME_HEADER = headerName("SSO_USERNAME_HEADER", "x-authentik-username");
