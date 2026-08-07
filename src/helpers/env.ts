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

// Trusted-header (reverse-proxy) SSO. When enabled, a reverse proxy in front of
// ConvertX (Authentik, Authelia, oauth2-proxy, Cloudflare Access, ...) performs
// authentication and passes the authenticated identity in a header. ConvertX
// trusts that header, auto-provisions/looks up the matching account and signs
// the user in — no second ConvertX login.
//
// SECURITY: only enable behind a proxy that STRIPS any client-supplied copy of
// HTTP_REMOTE_USER_HEADER before injecting its own. Without a trusted proxy in
// front, a client can send the header directly and impersonate any user. Never
// enable this when ConvertX is reachable by clients directly. See the README.
export const HTTP_REMOTE_USER_ENABLED =
  process.env.HTTP_REMOTE_USER_ENABLED?.toLowerCase() === "true" || false;

// Name of the header the trusted proxy injects the authenticated identity in.
// Default "Remote-User" (the common convention). For an Authentik forward-auth
// outpost set this to "X-authentik-email" (or "X-authentik-username"); for
// oauth2-proxy "X-Forwarded-Email"; for Authelia "Remote-User". Header lookup
// is case-insensitive.
export const HTTP_REMOTE_USER_HEADER = process.env.HTTP_REMOTE_USER_HEADER || "Remote-User";

export const TIMEZONE = process.env.TZ || undefined;
