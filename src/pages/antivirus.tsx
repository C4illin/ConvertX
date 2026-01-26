// src/pages/antivirus.tsx

import { Elysia, t } from "elysia";
import { userService } from "./user";
import {
  isAntivirusAvailable,
  isAntivirusEnabled,
  setAntivirusEnabled,
} from "../helpers/avToggle";

/**
 * Antivirus toggle API
 *
 * GET  /api/antivirus  (auth required)
 *   -> { available: boolean, enabled: boolean }
 *
 * POST /api/antivirus  (auth required)
 *   body: { enabled: boolean }
 *   -> { available: boolean, enabled: boolean }
 *
 * - `available` reflects CLAMAV_URL (via isAntivirusAvailable()).
 * - `enabled` is the global effective flag used by upload.tsx.
 */
export const antivirus = new Elysia()
  .use(userService)

  // Read current antivirus state
  .get(
    "/api/antivirus",
    () => {
      const available = isAntivirusAvailable();
      const enabled = isAntivirusEnabled();

      console.log(
        "[Antivirus API][GET] available:",
        available,
        "enabled:",
        enabled,
      );

      return { available, enabled };
    },
    {
      // 🔒 Only logged-in users should see global AV state
      auth: true,
    },
  )

  // Update antivirus state (enable/disable)
  .post(
    "/api/antivirus",
    ({ body }) => {
      const requested = Boolean(body.enabled);
      const available = isAntivirusAvailable();

      console.log(
        "[Antivirus API][POST] requested enabled=",
        requested,
        "available=",
        available,
      );

      // If AV is not available (CLAMAV_URL missing), force disabled
      if (!available) {
        console.warn(
          "[Antivirus API][POST] CLAMAV_URL not configured. Refusing to enable antivirus.",
        );
        return {
          available: false,
          enabled: false,
        };
      }

      // Persist the new state
      setAntivirusEnabled(requested);

      const effectiveEnabled = isAntivirusEnabled();

      console.log(
        "[Antivirus API][POST] effective enabled=",
        effectiveEnabled,
      );

      return {
        available: true,
        enabled: effectiveEnabled,
      };
    },
    {
      body: t.Object({
        enabled: t.Boolean(),
      }),
      // 🔒 Only logged-in users can change global AV setting
      auth: true,
    },
  );

