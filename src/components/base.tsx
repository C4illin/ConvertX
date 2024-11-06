import { Html } from "@elysiajs/html";

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
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href={`${webroot}/apple-touch-icon.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href={`${webroot}/favicon-32x32.png`}
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href={`${webroot}/favicon-16x16.png`}
      />
      <link rel="manifest" href={`${webroot}/site.webmanifest`} />
    </head>
    <body class="w-full bg-neutral-900 text-neutral-200">{children}</body>
  </html>
);
