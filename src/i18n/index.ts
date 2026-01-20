// Core languages
import en from "../locales/en.json";
import zhTW from "../locales/zh-TW.json";
import zhCN from "../locales/zh-CN.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";

// European languages
import de from "../locales/de.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import it from "../locales/it.json";
import pt from "../locales/pt.json";
import ru from "../locales/ru.json";
import nl from "../locales/nl.json";
import pl from "../locales/pl.json";
import uk from "../locales/uk.json";
import cs from "../locales/cs.json";
import sv from "../locales/sv.json";
import da from "../locales/da.json";
import fi from "../locales/fi.json";
import no from "../locales/no.json";
import el from "../locales/el.json";
import hu from "../locales/hu.json";
import ro from "../locales/ro.json";
import bg from "../locales/bg.json";
import hr from "../locales/hr.json";
import sk from "../locales/sk.json";
import sl from "../locales/sl.json";
import lt from "../locales/lt.json";
import lv from "../locales/lv.json";
import et from "../locales/et.json";
import sr from "../locales/sr.json";
import ca from "../locales/ca.json";
import eu from "../locales/eu.json";
import gl from "../locales/gl.json";
import is from "../locales/is.json";
import ga from "../locales/ga.json";
import cy from "../locales/cy.json";
import mt from "../locales/mt.json";
import mk from "../locales/mk.json";
import sq from "../locales/sq.json";

// Middle East & Central Asian languages
import ar from "../locales/ar.json";
import he from "../locales/he.json";
import fa from "../locales/fa.json";
import tr from "../locales/tr.json";

// South Asian languages
import hi from "../locales/hi.json";
import bn from "../locales/bn.json";
import ta from "../locales/ta.json";
import te from "../locales/te.json";
import mr from "../locales/mr.json";
import gu from "../locales/gu.json";
import kn from "../locales/kn.json";
import ml from "../locales/ml.json";
import ne from "../locales/ne.json";
import si from "../locales/si.json";

// Southeast Asian languages
import th from "../locales/th.json";
import vi from "../locales/vi.json";
import id from "../locales/id.json";
import ms from "../locales/ms.json";
import fil from "../locales/fil.json";
import my from "../locales/my.json";
import km from "../locales/km.json";
import lo from "../locales/lo.json";

// African languages
import af from "../locales/af.json";
import sw from "../locales/sw.json";
import am from "../locales/am.json";
import zu from "../locales/zu.json";

export type SupportedLocale =
  | "en" | "zh-TW" | "zh-CN" | "ja" | "ko"
  | "de" | "fr" | "es" | "it" | "pt" | "ru" | "nl" | "pl" | "uk"
  | "cs" | "sv" | "da" | "fi" | "no" | "el" | "hu" | "ro" | "bg"
  | "hr" | "sk" | "sl" | "lt" | "lv" | "et" | "sr" | "ca" | "eu"
  | "gl" | "is" | "ga" | "cy" | "mt" | "mk" | "sq"
  | "ar" | "he" | "fa" | "tr"
  | "hi" | "bn" | "ta" | "te" | "mr" | "gu" | "kn" | "ml" | "ne" | "si"
  | "th" | "vi" | "id" | "ms" | "fil" | "my" | "km" | "lo"
  | "af" | "sw" | "am" | "zu";

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
}

export const supportedLocales: LocaleConfig[] = [
  // Primary languages
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  
  // European languages
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "no", name: "Norwegian", nativeName: "Norsk" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "eu", name: "Basque", nativeName: "Euskara" },
  { code: "gl", name: "Galician", nativeName: "Galego" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg" },
  { code: "mt", name: "Maltese", nativeName: "Malti" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  
  // Middle East & Central Asian languages
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  
  // South Asian languages
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  
  // Southeast Asian languages
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "fil", name: "Filipino", nativeName: "Filipino" },
  { code: "my", name: "Burmese", nativeName: "မြန်မာ" },
  { code: "km", name: "Khmer", nativeName: "ខ្មែរ" },
  { code: "lo", name: "Lao", nativeName: "ລາວ" },
  
  // African languages
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
];

// Default to zh-TW, fallback to en
export const defaultLocale: SupportedLocale = "zh-TW";
export const fallbackLocale: SupportedLocale = "en";

// Type definitions for translation keys
export type TranslationData = typeof en;
export type TranslationKey = keyof TranslationData;
export type NestedTranslationKey<T extends TranslationKey> = keyof TranslationData[T];

const translations: Record<SupportedLocale, TranslationData> = {
  // Core languages
  en,
  "zh-TW": zhTW as TranslationData,
  "zh-CN": zhCN as TranslationData,
  ja: ja as TranslationData,
  ko: ko as TranslationData,
  
  // European languages
  de: de as TranslationData,
  fr: fr as TranslationData,
  es: es as TranslationData,
  it: it as TranslationData,
  pt: pt as TranslationData,
  ru: ru as TranslationData,
  nl: nl as TranslationData,
  pl: pl as TranslationData,
  uk: uk as TranslationData,
  cs: cs as TranslationData,
  sv: sv as TranslationData,
  da: da as TranslationData,
  fi: fi as TranslationData,
  no: no as TranslationData,
  el: el as TranslationData,
  hu: hu as TranslationData,
  ro: ro as TranslationData,
  bg: bg as TranslationData,
  hr: hr as TranslationData,
  sk: sk as TranslationData,
  sl: sl as TranslationData,
  lt: lt as TranslationData,
  lv: lv as TranslationData,
  et: et as TranslationData,
  sr: sr as TranslationData,
  ca: ca as TranslationData,
  eu: eu as TranslationData,
  gl: gl as TranslationData,
  is: is as TranslationData,
  ga: ga as TranslationData,
  cy: cy as TranslationData,
  mt: mt as TranslationData,
  mk: mk as TranslationData,
  sq: sq as TranslationData,
  
  // Middle East & Central Asian languages
  ar: ar as TranslationData,
  he: he as TranslationData,
  fa: fa as TranslationData,
  tr: tr as TranslationData,
  
  // South Asian languages
  hi: hi as TranslationData,
  bn: bn as TranslationData,
  ta: ta as TranslationData,
  te: te as TranslationData,
  mr: mr as TranslationData,
  gu: gu as TranslationData,
  kn: kn as TranslationData,
  ml: ml as TranslationData,
  ne: ne as TranslationData,
  si: si as TranslationData,
  
  // Southeast Asian languages
  th: th as TranslationData,
  vi: vi as TranslationData,
  id: id as TranslationData,
  ms: ms as TranslationData,
  fil: fil as TranslationData,
  my: my as TranslationData,
  km: km as TranslationData,
  lo: lo as TranslationData,
  
  // African languages
  af: af as TranslationData,
  sw: sw as TranslationData,
  am: am as TranslationData,
  zu: zu as TranslationData,
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
  const localeData = translations[locale];
  const translation = localeData?.[category]?.[key as keyof TranslationData[T]];

  if (typeof translation !== "string") {
    // Fallback to English
    const fallback =
      translations[fallbackLocale]?.[category]?.[key as keyof TranslationData[T]];
    if (typeof fallback !== "string") {
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
    // Direct match (case-insensitive)
    const directMatch = supportedLocales.find(
      (l) => l.code.toLowerCase() === lang.code
    );
    if (directMatch) {
      return directMatch.code;
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

    // Check base language (e.g., "en-US" -> "en")
    const baseCode = lang.code.split("-")[0];
    if (baseCode) {
      const baseMatch = supportedLocales.find(
        (l) => l.code.toLowerCase() === baseCode || l.code.toLowerCase().startsWith(baseCode + "-")
      );
      if (baseMatch) {
        return baseMatch.code;
      }
    }
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
  return translations[locale] ?? translations[fallbackLocale];
}

// Export locale codes as array
export const localeCodes = supportedLocales.map((l) => l.code);
