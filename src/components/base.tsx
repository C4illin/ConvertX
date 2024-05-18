export const BaseHtml = ({ children, title = "ConvertX" }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <link rel="stylesheet" href="/pico.lime.min.css" />
      <link rel="stylesheet" href="/style.css" />
      <script src="https://unpkg.com/htmx.org@1.9.12"></script>
    </head>
    <body>{children}</body>
  </html>
);
