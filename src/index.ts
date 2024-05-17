import { Elysia, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { html } from "@elysiajs/html";
import { Database } from "bun:sqlite";
import cookie from "@elysiajs/cookie";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
// import { Lucia } from "lucia";
// import { BunSQLiteAdapter } from "@lucia-auth/adapter-sqlite";

const db = new Database("./mydb.sqlite");
const uploadsDir = "./uploads/";

// init db
db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL,
	password TEXT NOT NULL
);
`);

const basicAuthModel = new Elysia().model({
	basicAuthModel: t.Object({
		email: t.String(),
		password: t.String(),
	}),
});

const app = new Elysia()
	.use(cookie())
	.use(
		jwt({
			name: "jwt",
			schema: t.Object({
				id: t.String(),
			}),
			secret: "secret",
			exp: "7d",
		}),
	)
	.use(html())
	.use(
		staticPlugin({
			assets: "src/public/",
			prefix: "/",
		}),
	)
	.get("/register", async () => {
		return Bun.file("src/pages/register.html");
	})
	.post(
		"/register",
		async function handler({ body, set, jwt, cookie: { auth } }) {
			const existingUser = await db
				.query("SELECT * FROM users WHERE email = ?")
				.get(body.email);
			if (existingUser) {
				set.status = 400;
				return {
					message: "Email already in use.",
				};
			}
			const savedPassword = await Bun.password.hash(body.password);

			db.run(
				"INSERT INTO users (email, password) VALUES (?, ?)",
				body.email,
				savedPassword,
			);

			const user = await db
				.query("SELECT * FROM users WHERE email = ?")
				.get(body.email);

			const accessToken = await jwt.sign({
				id: String(user.id),
			});

			// set cookie
			auth.set({
				value: accessToken,
				httpOnly: true,
				secure: true,
				maxAge: 60 * 60 * 24 * 7,
				sameSite: "strict",
			});

			// redirect to home
			set.status = 302;
			set.headers = {
				Location: "/",
			};
		},
	)
	.get("/login", async () => {
		return Bun.file("src/pages/login.html");
	})
	.post("/login", async function handler({ body, set, jwt, cookie: { auth } }) {
		const existingUser = await db
			.query("SELECT * FROM users WHERE email = ?")
			.get(body.email);

		if (!existingUser) {
			set.status = 403;
			return {
				message: "Invalid credentials.",
			};
		}

		const validPassword = await Bun.password.verify(
			body.password,
			existingUser.password,
		);

		if (!validPassword) {
			set.status = 403;
			return {
				message: "Invalid credentials.",
			};
		}

		const accessToken = await jwt.sign({
			id: String(existingUser.id),
		});

		// set cookie
		// set cookie
		auth.set({
			value: accessToken,
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "strict",
		});

		// redirect to home
		set.status = 302;
		set.headers = {
			Location: "/",
		};
	})
	.post("/logout", async ({ set, cookie: { auth } }) => {
		auth.remove();
		set.status = 302;
		set.headers = {
			Location: "/login",
		};
	})
	.get("/", async ({ jwt, set, cookie: { auth } }) => {
		// validate jwt
		const user = await jwt.verify(auth.value);
		if (!user) {
			// redirect to login
			set.status = 302;
			set.headers = {
				Location: "/login",
			};
			return;
		}
		return Bun.file("src/pages/index.html");
	})
	.post("/upload", async (ctx) => {
		console.log(ctx.body);
		if (ctx.body?.file) {
			await Bun.write(`${uploadsDir}${ctx.body.file.name}`, ctx.body.file);
		} else if (ctx.body?.files) {
			if (Array.isArray(ctx.body.files)) {
				for (const file of ctx.body.files) {
					console.log(file);
					await Bun.write(`${uploadsDir}${file.name}`, file);
				}
			} else {
				await Bun.write(`${uploadsDir}${ctx.body.files.name}`, ctx.body.files);
			}
		}
	})
	.post("/delete/:file", async (ctx) => {
		await unlink(`${uploadsDir}${ctx.params.file}`);
	})
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
