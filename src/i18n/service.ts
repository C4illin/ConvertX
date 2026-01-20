import { Elysia, t } from "elysia";
import {
  type SupportedLocale,
  createTranslator,
  defaultLocale,
  detectLocale,
  getLocale,
} from "../i18n";

/**
 * Elysia plugin for i18n/locale handling
 * Adds locale detection and translator to the context
 */
export const localeService = new Elysia({ name: "locale/service" })
  .model({
    localeSession: t.Cookie({
      locale: t.Optional(t.String()),
    }),
  })
  .derive({ as: "global" }, ({ cookie, request }) => {
    // Get locale from cookie or detect from Accept-Language header
    const cookieLocale = cookie.locale?.value;
    const acceptLanguage = request.headers.get("accept-language") ?? undefined;

    let locale: SupportedLocale;

    if (cookieLocale) {
      locale = getLocale(cookieLocale);
    } else {
      locale = detectLocale(acceptLanguage);
    }

    const t = createTranslator(locale);

    return {
      locale,
      t,
    };
  });

export type LocaleContext = {
  locale: SupportedLocale;
  t: ReturnType<typeof createTranslator>;
};
