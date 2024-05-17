import { Elysia, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { html } from "@elysiajs/html";
import { Database } from "bun:sqlite";
import cookie from "@elysiajs/cookie";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";

const db = new Database("./mydb.sqlite");
const uploadsDir = "./uploads/";

// init db
db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL,
	password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	job_id TEXT NOT NULL,
	date_created TEXT NOT NULL
);`);

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
	.get("/", async ({ jwt, set, cookie: { auth, jobId } }) => {
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

		// make sure user exists in db
		const existingUser = await db
			.query("SELECT * FROM users WHERE id = ?")
			.get(user.id);

		if (!existingUser) {
			// redirect to login and clear cookie
			auth.remove();
			set.status = 302;
			set.headers = {
				Location: "/login",
			};
			return;
		}

		// create a unique job id
		jobId.set({
			value: randomUUID(),
			httpOnly: true,
			secure: true,
			maxAge: 24 * 60 * 60,
			sameSite: "strict",
		});

		// insert job id into db
		db.run(
			"INSERT INTO jobs (user_id, job_id, date_created) VALUES (?, ?, ?)",
			user.id,
			jobId.value,
			new Date().toISOString(),
		);

		return Bun.file("src/pages/index.html");
	})
	.post("/upload", async ({ body, set, jwt, cookie: { auth, jobId } }) => {
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

		// let filesUploaded = [];

		const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

		if (body?.file) {
			await Bun.write(`${userUploadsDir}${body.file.name}`, body.file);
			// filesUploaded.push(body.file.name);
		} else if (body?.files) {
			if (Array.isArray(body.files)) {
				for (const file of body.files) {
					console.log(file);
					await Bun.write(`${userUploadsDir}${file.name}`, file);
					// filesUploaded.push(file.name);
				}
			} else {
				await Bun.write(`${userUploadsDir}${body.files.name}`, body.files);
				// filesUploaded.push(body.files.name);
			}
		}
	})
	.post("/delete", async ({ body, set, jwt, cookie: { auth, jobId } }) => {
		const user = await jwt.verify(auth.value);
		if (!user) {
			// redirect to login
			set.status = 302;
			set.headers = {
				Location: "/login",
			};
			return;
		}

		const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

		await unlink(`${userUploadsDir}${body.filename}`);
	})
	.post("/convert", async (ctx) => {
		console.log(ctx.body);
	})
	.listen(3000);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
