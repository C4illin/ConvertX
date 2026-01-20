import { Elysia } from "elysia";
import {
  type SupportedLocale,
  createTranslator,
  detectLocale,
  getLocale,
} from "../i18n";

/**
 * Elysia plugin for i18n/locale handling
 * Adds locale detection and translator to the context
 */
export const localeService = new Elysia({ name: "locale/service" })
  .derive({ as: "global" }, ({ request }) => {
    // Get locale from cookie (parsed from headers) or detect from Accept-Language header
    const cookieHeader = request.headers.get("cookie") ?? "";
    const acceptLanguage = request.headers.get("accept-language") ?? undefined;

    // Parse locale from cookie string
    let cookieLocale: string | undefined;
    const localeMatch = cookieHeader.match(/locale=([^;]+)/);
    if (localeMatch) {
      cookieLocale = localeMatch[1];
    }

    let locale: SupportedLocale;

    if (cookieLocale && typeof cookieLocale === "string") {
      locale = getLocale(cookieLocale);
    } else {
      locale = detectLocale(acceptLanguage);
    }

    const translator = createTranslator(locale);

    return {
      locale,
      t: translator,
    };
  });

export type LocaleContext = {
  locale: SupportedLocale;
  t: ReturnType<typeof createTranslator>;
};
