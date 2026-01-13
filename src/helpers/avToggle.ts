// src/helpers/avToggle.ts
//
// Simple in-memory antivirus toggle.
// Default behaviour: enabled by default when ClamAV is configured, unless explicitly overridden.

import { ANTIVIRUS_ENABLED_DEFAULT, CLAMAV_CONFIGURED } from "./env";

let antivirusEnabled: boolean = CLAMAV_CONFIGURED ? ANTIVIRUS_ENABLED_DEFAULT : false;

/**
 * Is ClamAV configured at all (CLAMAV_URL set)?
 */
export function isAntivirusAvailable(): boolean {
  return CLAMAV_CONFIGURED;
}

/**
 * Current effective antivirus enabled state.
 * If ClamAV is not configured, this always returns false.
 */
export function isAntivirusEnabled(): boolean {
  if (!CLAMAV_CONFIGURED) return false;
  return antivirusEnabled;
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
  antivirusEnabled = Boolean(enabled);
}

/**
 * Useful if env / configuration changes at runtime (tests, hot reload).
 */
export function resetAntivirusEnabledToDefault(): void {
  antivirusEnabled = CLAMAV_CONFIGURED ? ANTIVIRUS_ENABLED_DEFAULT : false;
}

