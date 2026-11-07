import { version } from "../../package.json";

export const BaseHtml = ({
  children,
  title = "WinC Convert",
  webroot = "",
}: {
  children: JSX.Element;
  title?: string;
  webroot?: string;
}) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="webroot" content={webroot} />
      <title safe>{title}</title>
      <link rel="stylesheet" href={`${webroot}/generated.css`} />
      <link rel="apple-touch-icon" sizes="180x180" href={`${webroot}/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${webroot}/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${webroot}/favicon-16x16.png`} />
      <link rel="manifest" href={`${webroot}/site.webmanifest`} />
    </head>
    <body class={`flex min-h-screen w-full flex-col bg-neutral-900 text-neutral-200`}>
      {children}
      <footer class="w-full">
        <div class="p-4 text-center text-sm text-neutral-500">
          <p class="mb-1">
            Files are deleted automatically after 24 hours. Need help?{" "}
            <a
              href="mailto:support@wincservices.com"
              class={`
                text-neutral-400
                hover:text-accent-500
              `}
            >
              support@wincservices.com
            </a>
          </p>
          <p>
            <span>WinC Convert by </span>
            <a
              href="https://wincservices.com"
              class={`
                text-neutral-400
                hover:text-accent-500
              `}
            >
              WinC Services
            </a>
            <span> | Based on </span>
            <a
              href="https://github.com/C4illin/ConvertX"
              class={`
                text-neutral-400
                hover:text-accent-500
              `}
            >
              ConvertX
            </a>
            <span> | </span>
            <a
              href="https://github.com/wincservices/ConvertX"
              class={`
                text-neutral-400
                hover:text-accent-500
              `}
            >
              Source
            </a>
            <span safe> | v{version || ""}</span>
          </p>
        </div>
      </footer>
    </body>
  </html>
);
