import { Elysia } from "elysia";
import { staticPlugin } from '@elysiajs/static'
import { html } from '@elysiajs/html'

const app = new Elysia()
  .use(html())
  .use(staticPlugin({
    assets: "src/public/", prefix: "/"
  }))
  .get("/", () => Bun.file("src/pages/index.html"))
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
