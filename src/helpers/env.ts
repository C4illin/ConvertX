export const ACCOUNT_REGISTRATION =
  process.env.ACCOUNT_REGISTRATION?.toLowerCase() === "true" || false;

export const HTTP_ALLOWED = process.env.HTTP_ALLOWED?.toLowerCase() === "true" || false;

export const ALLOW_UNAUTHENTICATED =
  process.env.ALLOW_UNAUTHENTICATED?.toLowerCase() === "true" || false;

export const AUTO_DELETE_EVERY_N_HOURS = process.env.AUTO_DELETE_EVERY_N_HOURS
  ? Number(process.env.AUTO_DELETE_EVERY_N_HOURS)
  : 24;

export const HIDE_HISTORY = process.env.HIDE_HISTORY?.toLowerCase() === "true" || false;

export const WEBROOT = process.env.WEBROOT ?? "";

export const LANGUAGE = process.env.LANGUAGE?.toLowerCase() || "en";

export const MAX_CONVERT_PROCESS =
  process.env.MAX_CONVERT_PROCESS && Number(process.env.MAX_CONVERT_PROCESS) > 0
    ? Number(process.env.MAX_CONVERT_PROCESS)
    : 0;

export const UNAUTHENTICATED_USER_SHARING =
  process.env.UNAUTHENTICATED_USER_SHARING?.toLowerCase() === "true" || false;

export const TIMEZONE = process.env.TZ || undefined;

export const OIDC_ISSUER = process.env.OIDC_ISSUER ?? "";

export const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID ?? "";

export const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET ?? "";

export const OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI ?? "";

export const OIDC_SCOPES = process.env.OIDC_SCOPES ?? "openid profile email";

export const OIDC_NAME = process.env.OIDC_NAME ?? "SSO";

// Only enable OIDC once all required settings are present.
export const OIDC_ENABLED = Boolean(OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_REDIRECT_URI);

// Hide the local email/password form entirely and only allow OIDC login.
export const OIDC_ONLY = OIDC_ENABLED && process.env.OIDC_ONLY?.toLowerCase() === "true";
