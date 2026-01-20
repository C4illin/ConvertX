import { type SupportedLocale, type Translator, createTranslator, defaultLocale } from "../i18n/index";
import { LanguageSelector } from "./languageSelector";

export const Header = ({
  loggedIn,
  accountRegistration,
  allowUnauthenticated,
  hideHistory,
  webroot = "",
  locale = defaultLocale,
  t = createTranslator(defaultLocale),
}: {
  loggedIn?: boolean;
  accountRegistration?: boolean;
  allowUnauthenticated?: boolean;
  hideHistory?: boolean;
  webroot?: string;
  locale?: SupportedLocale;
  t?: Translator;
}) => {
  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul class="flex items-center gap-4">
        {!hideHistory && (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/history`}
            >
              {t("nav", "history")}
            </a>
          </li>
        )}
        {!allowUnauthenticated ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/account`}
            >
              {t("nav", "account")}
            </a>
          </li>
        ) : null}
        {!allowUnauthenticated ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/logoff`}
            >
              {t("nav", "logout")}
            </a>
          </li>
        ) : null}
        <li>
          <LanguageSelector currentLocale={locale} webroot={webroot} t={t} />
        </li>
      </ul>
    );
  } else {
    rightNav = (
      <ul class="flex items-center gap-4">
        <li>
          <a
            class={`
              text-accent-600 transition-all
              hover:text-accent-500 hover:underline
            `}
            href={`${webroot}/login`}
          >
            {t("nav", "login")}
          </a>
        </li>
        {accountRegistration ? (
          <li>
            <a
              class={`
                text-accent-600 transition-all
                hover:text-accent-500 hover:underline
              `}
              href={`${webroot}/register`}
            >
              {t("nav", "register")}
            </a>
          </li>
        ) : null}
        <li>
          <LanguageSelector currentLocale={locale} webroot={webroot} t={t} />
        </li>
      </ul>
    );
  }

  return (
    <header class="w-full p-4">
      <nav class={`mx-auto flex max-w-4xl justify-between rounded-sm bg-neutral-900 p-4`}>
        <ul>
          <li>
            <strong>
              <a href={`${webroot}/`}>ConvertX-CN</a>
            </strong>
          </li>
        </ul>
        {rightNav}
      </nav>
    </header>
  );
};
