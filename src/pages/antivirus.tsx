// src/pages/antivirus.tsx

import { Elysia, t } from "elysia";
import { userService } from "./user";
import {
  isAntivirusAvailable,
  isAntivirusEnabled,
  setAntivirusEnabled,
} from "../helpers/avToggle";

export const antivirus = new Elysia()
  .use(userService)
  // Get current AV status
  .get("/api/antivirus", () => {
    const available = isAntivirusAvailable();
    const enabled = isAntivirusEnabled();
    return { available, enabled };
  })
  // Update AV status
  .post(
    "/api/antivirus",
    ({ body }) => {
      const { enabled } = body;

      if (!isAntivirusAvailable()) {
        // CLAMAV_URL missing: force disabled and report unavailable
        return {
          available: false,
          enabled: false,
        };
      }

      setAntivirusEnabled(Boolean(enabled));

      return {
        available: true,
        enabled: isAntivirusEnabled(),
      };
    },
    {
      body: t.Object({
        enabled: t.Boolean(),
      }),
    },
  );
