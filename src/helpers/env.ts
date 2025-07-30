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

export const MAX_CONVERT_PROCESS = process.env.MAX_CONVERT_PROCESS && Number(process.env.MAX_CONVERT_PROCESS) > 0 ? Number(process.env.MAX_CONVERT_PROCESS) : 0

export const UNAUTHENTICATED_USER_SHARING =
  process.env.UNAUTHENTICATED_USER_SHARING?.toLowerCase() === "true" || false;

// API Configuration
export const API_ENABLED = process.env.API_ENABLED?.toLowerCase() !== "false";

export const API_PREFIX = process.env.API_PREFIX ?? "/api/v1";

export const API_RATE_LIMIT = process.env.API_RATE_LIMIT
  ? Number(process.env.API_RATE_LIMIT)
  : 100;

export const API_RATE_WINDOW = process.env.API_RATE_WINDOW ?? "15m";

export const API_KEY_ENABLED = process.env.API_KEY_ENABLED?.toLowerCase() === "true" || false;