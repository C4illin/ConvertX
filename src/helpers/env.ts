// ConvertX core settings
export const ACCOUNT_REGISTRATION =
  process.env.ACCOUNT_REGISTRATION?.toLowerCase() === "true" || false;

export const HTTP_ALLOWED =
  process.env.HTTP_ALLOWED?.toLowerCase() === "true" || false;

export const ALLOW_UNAUTHENTICATED =
  process.env.ALLOW_UNAUTHENTICATED?.toLowerCase() === "true" || false;

export const AUTO_DELETE_EVERY_N_HOURS = process.env.AUTO_DELETE_EVERY_N_HOURS
  ? Number(process.env.AUTO_DELETE_EVERY_N_HOURS)
  : 24;

export const HIDE_HISTORY =
  process.env.HIDE_HISTORY?.toLowerCase() === "true" || false;

export const WEBROOT = process.env.WEBROOT ?? "";

export const LANGUAGE = process.env.LANGUAGE?.toLowerCase() || "en";

export const MAX_CONVERT_PROCESS =
  process.env.MAX_CONVERT_PROCESS && Number(process.env.MAX_CONVERT_PROCESS) > 0
    ? Number(process.env.MAX_CONVERT_PROCESS)
    : 0;

export const UNAUTHENTICATED_USER_SHARING =
  process.env.UNAUTHENTICICATED_USER_SHARING?.toLowerCase() === "true" ||
  false;

// ------------------------------
// Antivirus (ConvertX original)
// ------------------------------
export const CLAMAV_URL = process.env.CLAMAV_URL ?? "";
export const CLAMAV_CONFIGURED = CLAMAV_URL.length > 0;

export const ANTIVIRUS_ENABLED_DEFAULT =
  process.env.ANTIVIRUS_ENABLED_DEFAULT === undefined
    ? true
    : process.env.ANTIVIRUS_ENABLED_DEFAULT.toLowerCase() === "true";

// ------------------------------
// Erugo integration
// ------------------------------
export const ERUGO_BASE_URL = process.env.ERUGO_BASE_URL ?? "";
export const ERUGO_API_TOKEN = process.env.ERUGO_API_TOKEN ?? "";
export const ERUGO_DEFAULT_EXPIRY_HOURS = process.env.ERUGO_DEFAULT_EXPIRY_HOURS
  ? Number(process.env.ERUGO_DEFAULT_EXPIRY_HOURS)
  : 168;

export const ERUGO_CONFIGURED =
  ERUGO_BASE_URL.length > 0 && ERUGO_API_TOKEN.length > 0;

export const TIMEZONE = process.env.TZ || undefined;
