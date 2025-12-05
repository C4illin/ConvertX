// src/helpers/avToggle.ts

import {
  ANTIVIRUS_ENABLED_DEFAULT,
  CLAMAV_CONFIGURED,
} from "./env";

let antivirusEnabled = ANTIVIRUS_ENABLED_DEFAULT;

/**
 * Is ClamAV configured at all (CLAMAV_URL set)?
 */
export function isAntivirusAvailable(): boolean {
  return CLAMAV_CONFIGURED;
}

/**
 * Is antivirus scanning currently enabled (and available)?
 */
export function isAntivirusEnabled(): boolean {
  return CLAMAV_CONFIGURED && antivirusEnabled;
}

/**
 * Change current antivirus enabled/disabled state.
 * If CLAMAV is not configured, this is effectively a no-op and remains false.
 */
export function setAntivirusEnabled(enabled: boolean): void {
  if (!CLAMAV_CONFIGURED) {
    antivirusEnabled = false;
    return;
  }
  antivirusEnabled = enabled;
}
