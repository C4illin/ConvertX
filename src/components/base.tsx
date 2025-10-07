import { version } from "../../package.json";

export const BaseHtml = ({
  children,
  title = "ConvertX",
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
          <span>Powered by </span>
          <a
            href="https://github.com/C4illin/ConvertX"
            class={`
              text-neutral-400
              hover:text-accent-500
            `}
          >
            ConvertX{" "}
          </a>
          <span safe>v{version || ""}</span>
        </div>
      </footer>
    </body>
  </html>
);
