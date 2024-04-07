import { Elysia } from "elysia";
import { staticPlugin } from '@elysiajs/static'

const app = new Elysia()
  .use(staticPlugin({
    assets: "../frontend/", prefix: "/"
  }))
  .get("/", () => Bun.file("../frontend/index.html"))
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
