import { version } from "../../package.json";
import { HTTP_ALLOWED } from "../helpers/env";

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
      {!HTTP_ALLOWED ? (
        <>
          <div
            id="http-warning"
            role="alert"
            class="m-4 rounded-sm border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-200"
          >
            Insecure HTTP connections cannot save the secure cookies needed to log in and convert
            files. Use HTTPS, or set <code>HTTP_ALLOWED=true</code> only if you are on a trusted
            local network.
          </div>
          <script>
            {`
              // Browsers also trust localhost and loopback HTTP connections.
              if (window.location.protocol !== "http:" || window.isSecureContext) {
                document.getElementById("http-warning").hidden = true;
              }
            `}
          </script>
        </>
      ) : null}
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
