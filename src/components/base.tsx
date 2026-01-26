import { version } from "../../package.json";
import { type SupportedLocale, defaultLocale, getTranslations } from "../i18n/index";

export const BaseHtml = ({
  children,
  title = "ConvertX-CN - 免費線上檔案轉換工具 | 支援 PDF、Word、圖片等格式轉換",
  webroot = "",
  locale = defaultLocale,
}: {
  children: JSX.Element;
  title?: string;
  webroot?: string;
  locale?: SupportedLocale;
}) => (
  <html lang={locale}>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* SEO 核心設定 - 允許搜尋引擎索引 */}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      <meta http-equiv="content-language" content="zh-CN" />

      {/* Canonical URL */}
      <link rel="canonical" href="https://convertx-cn.bioailab.qzz.io/" />

      {/* 多語言替代連結 */}
      <link rel="alternate" hreflang="zh-CN" href="https://convertx-cn.bioailab.qzz.io/" />
      <link rel="alternate" hreflang="x-default" href="https://convertx-cn.bioailab.qzz.io/" />

      {/* 應用程式資訊 */}
      <meta name="webroot" content={webroot} />
      <meta name="locale" content={locale} />
      <meta name="application-name" content="ConvertX-CN" />
      <meta name="apple-mobile-web-app-title" content="ConvertX-CN" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* SEO 描述與關鍵字 */}
      <meta
        name="description"
        content="ConvertX-CN 是免費的線上檔案轉換工具，支援 PDF、Word、Excel、圖片、影片等 100+ 種格式互轉。無需安裝軟體，自架部署保護隱私。"
      />
      <meta
        name="keywords"
        content="檔案轉換,PDF轉換,Word轉PDF,圖片轉換,格式轉換,線上轉換,免費工具,ConvertX"
      />
      <meta name="author" content="ConvertX-CN" />

      {/* Open Graph / 社交媒體分享 */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://convertx-cn.bioailab.qzz.io/" />
      <meta property="og:title" content="ConvertX-CN - 免費線上檔案轉換工具" />
      <meta
        property="og:description"
        content="支援 PDF、Word、Excel、圖片、影片等 100+ 種格式互轉，自架部署保護隱私。"
      />
      <meta property="og:locale" content="zh_CN" />
      <meta property="og:site_name" content="ConvertX-CN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="ConvertX-CN - 免費線上檔案轉換工具" />
      <meta
        name="twitter:description"
        content="支援 PDF、Word、Excel、圖片、影片等 100+ 種格式互轉"
      />

      <meta name="theme-color" content="#a5d601" />
      <title safe>{title}</title>
      <link rel="stylesheet" href={`${webroot}/generated.css`} />
      <link rel="apple-touch-icon" sizes="180x180" href={`${webroot}/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${webroot}/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${webroot}/favicon-16x16.png`} />
      <link rel="manifest" href={`${webroot}/site.webmanifest`} />
      <script>{`window.__TRANSLATIONS__ = ${JSON.stringify(getTranslations(locale))};`}</script>
      <script src={`${webroot}/i18n.js`} defer />
      <script src={`${webroot}/inference.js`} defer />
      <script src={`${webroot}/theme.js`} />
    </head>
    <body class={`flex min-h-screen w-full flex-col bg-neutral-900 text-neutral-200`}>
      {children}
      <footer class="w-full">
        <div class="p-4 text-center text-sm text-neutral-500">
          <span>Powered by </span>
          <a
            href="https://github.com/pi-docket/ConvertX-CN"
            class={`
              text-neutral-400
              hover:text-accent-500
            `}
          >
            ConvertX-CN
          </a>
          <span safe> v{version || ""}</span>
        </div>
      </footer>
    </body>
  </html>
);
