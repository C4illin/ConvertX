import en from "../locales/en.json";
import zhTW from "../locales/zh-TW.json";
import zhCN from "../locales/zh-CN.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";

export type SupportedLocale = "en" | "zh-TW" | "zh-CN" | "ja" | "ko";

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
}

export const supportedLocales: LocaleConfig[] = [
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
];

// Default to zh-TW, fallback to en
export const defaultLocale: SupportedLocale = "zh-TW";
export const fallbackLocale: SupportedLocale = "en";

// Type definitions for translation keys
export type TranslationData = typeof en;
export type TranslationKey = keyof TranslationData;
export type NestedTranslationKey<T extends TranslationKey> = keyof TranslationData[T];

const translations: Record<SupportedLocale, TranslationData> = {
  en,
  "zh-TW": zhTW as TranslationData,
  "zh-CN": zhCN as TranslationData,
  ja: ja as TranslationData,
  ko: ko as TranslationData,
};

/**
 * Get translation for a given key
 * @param locale - The locale code
 * @param category - The translation category (e.g., 'common', 'nav', 'convert')
 * @param key - The translation key within the category
 * @param params - Optional parameters for string interpolation
 * @returns The translated string
 */
export function t<T extends TranslationKey>(
  locale: SupportedLocale,
  category: T,
  key: NestedTranslationKey<T>,
  params?: Record<string, string | number>,
): string {
  const translation = translations[locale]?.[category]?.[key as keyof TranslationData[T]];

  if (typeof translation !== "string") {
    // Fallback to English
    const fallback =
      translations[defaultLocale]?.[category]?.[key as keyof TranslationData[T]];
    if (typeof fallback !== "string") {
      // Log missing translation in development
      // eslint-disable-next-line no-console
      console.warn(`Missing translation: ${category}.${String(key)}`);
      return `${category}.${String(key)}`;
    }
    return interpolate(fallback, params);
  }

  return interpolate(translation, params);
}

/**
 * Interpolate parameters into a translation string
 * @param text - The translation string with placeholders like {key}
 * @param params - The parameters to interpolate
 * @returns The interpolated string
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Detect the best locale based on the Accept-Language header
 * @param acceptLanguage - The Accept-Language header value
 * @returns The best matching locale
 */
export function detectLocale(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, priority] = lang.trim().split(";q=");
      return {
        code: code?.toLowerCase().trim() ?? "",
        priority: priority ? Number.parseFloat(priority) : 1,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  // Try to find a match
  for (const lang of languages) {
    // Direct match
    if (isValidLocale(lang.code)) {
      return lang.code as SupportedLocale;
    }

    // Check for language variants (e.g., zh-tw, zh-hant)
    if (lang.code.startsWith("zh")) {
      if (lang.code.includes("tw") || lang.code.includes("hant") || lang.code.includes("hk")) {
        return "zh-TW";
      }
      if (lang.code.includes("cn") || lang.code.includes("hans") || lang.code === "zh") {
        return "zh-CN";
      }
    }

    // Check base language
    const baseCode = lang.code.split("-")[0];
    if (baseCode === "ja") return "ja";
    if (baseCode === "ko") return "ko";
    if (baseCode === "en") return "en";
  }

  return defaultLocale;
}

/**
 * Check if a locale code is valid
 * @param locale - The locale code to check
 * @returns Whether the locale is valid
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.some(
    (l) => l.code.toLowerCase() === locale.toLowerCase(),
  );
}

/**
 * Get locale from string, with validation
 * @param locale - The locale string
 * @returns The valid locale or default
 */
export function getLocale(locale?: string): SupportedLocale {
  if (!locale) return defaultLocale;
  
  // Handle case-insensitive matching
  const normalized = locale.toLowerCase();
  const found = supportedLocales.find((l) => l.code.toLowerCase() === normalized);
  
  return found?.code ?? defaultLocale;
}

/**
 * Create a translator function bound to a specific locale
 * @param locale - The locale to use
 * @returns A translation function
 */
export function createTranslator(locale: SupportedLocale) {
  return <T extends TranslationKey>(
    category: T,
    key: NestedTranslationKey<T>,
    params?: Record<string, string | number>,
  ) => t(locale, category, key, params);
}

export type Translator = ReturnType<typeof createTranslator>;

// Export all translations for client-side use
export function getTranslations(locale: SupportedLocale): TranslationData {
  return translations[locale] ?? translations[defaultLocale];
}

// Export locale codes as array
export const localeCodes = supportedLocales.map((l) => l.code);
