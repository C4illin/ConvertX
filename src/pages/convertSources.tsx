import { Elysia, t } from "elysia";
import { getPossibleSources } from "../converters/main";
import { userService } from "./user";

// Place this next to (or inside the same file as) the existing
// `/conversions` route, so it shares whatever auth/db conventions
// that route already uses.
export const convertSources = new Elysia().use(userService).post(
  "/convert-sources",
  ({ body }) => {
    // Record<converterName, string[]>
    return getPossibleSources(body.to);
  },
  {
    body: t.Object({
      to: t.String(),
    }),
  },
);
