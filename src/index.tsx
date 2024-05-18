import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import cookie from "@elysiajs/cookie";
import { html } from "@elysiajs/html";
import { jwt } from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";
import { BaseHtml } from "./components/base";
import { Header } from "./components/header";
import { mainConverter, possibleConversions } from "./converters/main";
import { normalizeFiletype } from "./helpers/normalizeFiletype";

const db = new Database("./data/mydb.sqlite", { create: true });
const uploadsDir = "./data/uploads/";
const outputDir = "./data/output/";

const jobs = {};

// fileNames: fileNames,
// filesToConvert: fileNames.length,
// convertedFiles : 0,
// outputFiles: [],

// init db
db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL,
	password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS file_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  output_file_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	job_id TEXT NOT NULL,
	date_created TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  converted_files INTEGER DEFAULT 0
);`);

// enable WAL mode
db.exec("PRAGMA journal_mode = WAL;");

const app = new Elysia()
  .use(cookie())
  .use(html())
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
  .use(
    staticPlugin({
      assets: "src/public/",
      prefix: "/",
    }),
  )
  .get("/register", () => {
    return (
      <BaseHtml title="ConvertX | Register">
        <Header />
        <main class="container-fluid">
          <form method="post">
            <input type="email" name="email" placeholder="Email" required />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
            />
            <input type="submit" value="Register" />
          </form>
        </main>
      </BaseHtml>
    );
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
  .get("/login", () => {
    return (
      <BaseHtml title="ConvertX | Login">
        <Header />
        <main class="container-fluid">
          <form method="post">
            <input type="email" name="email" placeholder="Email" required />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
            />
            <div role="group">
              <a href="/register" role="button" class="secondary">
                Register an account
              </a>
              <input type="submit" value="Login" />
            </div>
          </form>
        </main>
      </BaseHtml>
    );
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
  .get("/logout", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }
    return redirect("/login");
  })
  .post("/logout", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect("/login");
  })
  .get("/", async ({ jwt, redirect, cookie: { auth, jobId } }) => {
    // validate jwt
    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login");
    }

    // make sure user exists in db
    const existingUser = await db
      .query("SELECT * FROM users WHERE id = ?")
      .get(user.id);

    if (!existingUser) {
      if (auth?.value) {
        auth.remove();
      }
      return redirect("/login");
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

    return (
      <BaseHtml>
        <Header loggedIn />
        <main class="container-fluid">
          <article>
            <table id="file-list" />
            <input type="file" name="file" multiple />
          </article>
          <form method="post" action="/convert">
            <input type="hidden" name="file_names" id="file_names" />
            <article>
              <select name="convert_to" aria-label="Convert to" required>
                <option selected disabled value="">
                  Convert to
                </option>
                <option>JPG</option>
                <option>PNG</option>
                <option>SVG</option>
                <option>PDF</option>
                <option>DOCX</option>
                <option>Yaml</option>
              </select>
            </article>
            <input type="submit" value="Convert" />
          </form>
        </main>
        <script src="script.js" defer />
      </BaseHtml>
    );
  })
  .post("/upload", async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
    // validate jwt
    if (!auth?.value) {
      // redirect to login
      return redirect("/login");
    }

    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login");
    }

    // let filesUploaded = [];

    const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

    if (body?.file) {
      if (Array.isArray(body.file)) {
        for (const file of body.file) {
          console.log(file);
          await Bun.write(`${userUploadsDir}${file.name}`, file);
        }
      } else {
        await Bun.write(`${userUploadsDir}${body.file.name}`, body.file);
      }
    }

    return {
      message: "Files uploaded successfully.",
    };
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
  .post(
    "/convert",
    async ({ body, set, redirect, jwt, cookie: { auth, jobId } }) => {
      const user = await jwt.verify(auth.value);
      if (!user) {
        // redirect to login
        set.status = 302;
        set.headers = {
          Location: "/login",
        };
        return;
      }

      if (!jobId?.value) {
        return redirect("/");
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;
      const userOutputDir = `${outputDir}${user.id}/${jobId.value}/`;

      // create the output directory
      try {
        await mkdir(userOutputDir, { recursive: true });
      } catch (error) {
        console.error(
          `Failed to create the output directory: ${userOutputDir}.`,
          error,
        );
      }

      const convertTo = normalizeFiletype(body.convert_to);
      const fileNames = JSON.parse(body.file_names);

      jobs[jobId.value] = {
        fileNames: fileNames,
        filesToConvert: fileNames.length,
        convertedFiles: 0,
        outputFiles: [],
      };

      for (const fileName of fileNames) {
        const filePath = `${userUploadsDir}${fileName}`;
        const fileTypeOrig = fileName.split(".").pop();
        const fileType = normalizeFiletype(fileTypeOrig);
        const newFileName = fileName.replace(fileTypeOrig, convertTo);
        const targetPath = `${userOutputDir}${newFileName}`;

        await mainConverter(filePath, fileType, convertTo, targetPath);
        jobs[jobId.value].convertedFiles++;
        jobs[jobId.value].outputFiles.push(newFileName);
      }

      console.log(
        "sending to results page...",
        `http://${app.server?.hostname}:${app.server?.port}/results/${jobId.value}`,
      );

      // redirect to results
      set.status = 302;
      set.headers = {
        Location: `/results/${jobId.value}`,
      };
    },
  )
  .get("/results", async ({ params, jwt, set, redirect, cookie: { auth } }) => {
    if (!auth?.value) {
      return redirect("/login");
    }
    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login");
    }

    const userJobs = await db
      .query("SELECT * FROM jobs WHERE user_id = ?")
      .all(user.id);
    
    return (
      <BaseHtml title="ConvertX | Results">
        <Header loggedIn />
        <main class="container-fluid">
          <article>
            <h1>Results</h1>
            <ul>
              {userJobs.map((job) => (
                <li>
                  <a href={`/results/${job.job_id}`}>{job.job_id}</a>
                </li>
              ))}
            </ul>
          </article>
        </main>
      </BaseHtml>
    );


    // list all jobs belonging to the user
  })
  .get(
    "/results/:jobId",
    async ({ params, jwt, set, redirect, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND job_id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      return (
        <BaseHtml>
          <Header loggedIn />
          <main class="container-fluid">
            <article>
              <h1>Results</h1>
              <ul>
                {jobs[params.jobId].outputFiles.map((file: string) => (
                  <li>
                    <a href={`/output/${user.id}/${params.jobId}/${file}`}>
                      {file}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </main>
        </BaseHtml>
      );
    },
  )
  .onError(({ code, error, request }) => {
    // log.error(` ${request.method} ${request.url}`, code, error);
    console.error(error);
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
