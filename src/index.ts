import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { html } from "@elysiajs/html";
import { Database } from "bun:sqlite";

const db = new Database("./mydb.sqlite");
const baseDir = import.meta.dir;
const uploadsDir = "./uploads/";

const app = new Elysia()
	.use(html())
	.use(
		staticPlugin({
			assets: "src/public/",
			prefix: "/",
		}),
	)
	.get("/", () => Bun.file("src/pages/index.html"))
	.post("/upload", async (ctx) => {
		console.log(ctx.body);
		if (ctx.body?.file) {
			await Bun.write(`${uploadsDir}${ctx.body.file.name}`, ctx.body.file);
		} else if (ctx.body?.files) {
			if (Array.isArray(ctx.body.files)) {
				console.log("Found array of files");
				for (const file of ctx.body.files) {
					console.log(file);
					await Bun.write(`${uploadsDir}${file.name}`, file);
				}
			} else {
				await Bun.write(`${uploadsDir}${ctx.body.files.name}`, ctx.body.files);
			}
		}
	})
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
