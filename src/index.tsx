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
import {
  mainConverter,
  getPossibleConversions,
  getAllTargets,
} from "./converters/main";
import { normalizeFiletype } from "./helpers/normalizeFiletype";

const db = new Database("./data/mydb.sqlite", { create: true });
const uploadsDir = "./data/uploads/";
const outputDir = "./data/output/";

const accountRegistration =
  process.env.ACCOUNT_REGISTRATION === "true" || false;

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
  job_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  output_file_name TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	date_created TEXT NOT NULL,
  status TEXT DEFAULT 'not started',
  num_files INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`);

interface IUser {
  id: number;
  email: string;
  password: string;
}

interface IFileNames {
  id: number;
  job_id: number;
  file_name: string;
  output_file_name: string;
}

interface IJobs {
  finished_files: number;
  id: number;
  user_id: number;
  date_created: string;
  status: string;
  num_files: number;
}

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
        <main class="container">
          <article>
            <form method="post">
              <fieldset>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                  />
                </label>
              </fieldset>
              <input type="submit" value="Register" />
            </form>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .post(
    "/register",
    async ({ body, set, jwt, cookie: { auth } }) => {
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

      db.query("INSERT INTO users (email, password) VALUES (?, ?)").run(
        body.email,
        savedPassword,
      );

      const user = (await db
        .query("SELECT * FROM users WHERE email = ?")
        .get(body.email)) as IUser;

      const accessToken = await jwt.sign({
        id: String(user.id),
      });

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

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
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
  .get("/login", async ({ jwt, redirect, cookie: { auth } }) => {
    console.log("login handler");
    // if already logged in, redirect to home
    if (auth?.value) {
      const user = await jwt.verify(auth.value);
      console.log(user);

      if (user) {
        return redirect("/");
      }

      auth.remove();
    }

    return (
      <BaseHtml title="ConvertX | Login">
        <Header />
        <main class="container">
          <article>
            <form method="post">
              <fieldset>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                  />
                </label>
              </fieldset>
              <div role="group">
                <a href="/register" role="button" class="secondary">
                  Register an account
                </a>
                <input type="submit" value="Login" />
              </div>
            </form>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .post(
    "/login",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      const existingUser = (await db
        .query("SELECT * FROM users WHERE email = ?")
        .get(body.email)) as IUser;

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

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      redirect("/");
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
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
    if (!auth?.value) {
      return redirect("/login");
    }
    // validate jwt
    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login");
    }

    // make sure user exists in db
    const existingUser = (await db
      .query("SELECT * FROM users WHERE id = ?")
      .get(user.id)) as IUser;

    if (!existingUser) {
      if (auth?.value) {
        auth.remove();
      }
      return redirect("/login");
    }

    // create a new job
    db.query("INSERT INTO jobs (user_id, date_created) VALUES (?, ?)").run(
      user.id,
      new Date().toISOString(),
    );

    const id = (
      db
        .query("SELECT id FROM jobs WHERE user_id = ? ORDER BY id DESC")
        .get(user.id) as { id: number }
    ).id;

    if (!jobId) {
      return { message: "Cookies should be enabled to use this app." };
    }

    jobId.set({
      value: id,
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60,
      sameSite: "strict",
    });

    return (
      <BaseHtml>
        <Header loggedIn />
        <main class="container">
          <article>
            <h1>Convert</h1>
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
                {getAllTargets().map((target) => (
                  // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                  <option value={target}>{target}</option>
                ))}
              </select>
            </article>
            <input type="submit" value="Convert" />
          </form>
        </main>
        <script src="script.js" defer />
      </BaseHtml>
    );
  })
  .post(
    "/conversions",
    ({ body }) => {
      console.log(body);
      return (
        <select name="convert_to" aria-label="Convert to" required>
          <option selected disabled value="">
            Convert to
          </option>
          {getPossibleConversions(body.fileType).map((target) => (
            // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
            <option value={target}>{target}</option>
          ))}
        </select>
      );
    },
    { body: t.Object({ fileType: t.String() }) },
  )
  .post(
    "/upload",
    async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      if (!jobId?.value) {
        return redirect("/");
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect("/");
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

      if (body?.file) {
        if (Array.isArray(body.file)) {
          for (const file of body.file) {
            await Bun.write(`${userUploadsDir}${file.name}`, file);
          }
        } else {
          await Bun.write(
            `${userUploadsDir}${
              // biome-ignore lint/complexity/useLiteralKeys: ts bug
              body.file["name"]
            }`,
            body.file,
          );
        }
      }

      return {
        message: "Files uploaded successfully.",
      };
    },
    { body: t.Object({ file: t.Files() }) },
  )
  .post(
    "/delete",
    async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      if (!jobId?.value) {
        return redirect("/");
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect("/");
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

      await unlink(`${userUploadsDir}${body.filename}`);
    },
    { body: t.Object({ filename: t.String() }) },
  )
  .post(
    "/convert",
    async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      if (!jobId?.value) {
        return redirect("/");
      }

      const existingJob = (await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id)) as IJobs;

      if (!existingJob) {
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
      const fileNames = JSON.parse(body.file_names) as string[];

      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        return redirect("/");
      }

      db.run(
        "UPDATE jobs SET num_files = ?, status = 'pending' WHERE id = ?",
        fileNames.length,
        jobId.value,
      );

      const query = db.query(
        "INSERT INTO file_names (job_id, file_name, output_file_name) VALUES (?, ?, ?)",
      );

      for (const fileName of fileNames) {
        const filePath = `${userUploadsDir}${fileName}`;
        const fileTypeOrig = fileName.split(".").pop() as string;
        const fileType = normalizeFiletype(fileTypeOrig);
        const newFileName = fileName.replace(fileTypeOrig, convertTo);
        const targetPath = `${userOutputDir}${newFileName}`;

        await mainConverter(filePath, fileType, convertTo, targetPath);
        query.run(jobId.value, fileName, newFileName);
      }

      return redirect(`/results/${jobId.value}`);
    },
    {
      body: t.Object({
        convert_to: t.String(),
        file_names: t.String(),
      }),
    },
  )
  .get("/test", async ({ jwt, redirect, cookie: { auth } }) => {
    console.log("results page");

    if (!auth?.value) {
      console.log("no auth value");
      return redirect("/login");
    }
    const user = await jwt.verify(auth.value);

    if (!user) {
      console.log("no user");
      return redirect("/login");
    }

    const userJobs = db
      .query("SELECT * FROM jobs WHERE user_id = ?")
      .all(user.id) as IJobs[];

    for (const job of userJobs) {
      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .all(job.id) as IFileNames[];

      job.finished_files = files.length;
    }

    return (
      <BaseHtml title="ConvertX | Results">
        <Header loggedIn />
        <main class="container">
          <article>
            <h1>Results</h1>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Files</th>
                  <th>Files Done</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {userJobs.map((job) => (
                  // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                  <tr>
                    <td>{job.date_created}</td>
                    <td>{job.num_files}</td>
                    <td>{job.finished_files}</td>
                    <td>{job.status}</td>
                    <td>
                      <a href={`/results/${job.id}`}>View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .get(
    "/results/:jobId",
    async ({ params, jwt, set, redirect, cookie: { auth, job_id } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      if (job_id?.value) {
        // clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      const job = (await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId)) as IJobs;

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .all(params.jobId) as IFileNames[];

      return (
        <BaseHtml title="ConvertX | Result">
          <Header loggedIn />
          <main class="container">
            <article>
              <div class="grid">
                <h1>Results</h1>
                <div>
                  <button
                    type="button"
                    style={{ width: "10rem", float: "right" }}
                    onclick="downloadAll()">
                    Download All
                  </button>
                </div>
              </div>
              <progress max={job.num_files} value={files.length} />
              <table>
                <thead>
                  <tr>
                    <th>Converted File Name</th>
                    <th>View</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                    <tr>
                      <td>{file.output_file_name}</td>
                      <td>
                        <a
                          href={`/download/${outputPath}${file.output_file_name}`}>
                          View
                        </a>
                      </td>
                      <td>
                        <a
                          href={`/download/${outputPath}${file.output_file_name}`}
                          download={file.output_file_name}>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </main>
          <script src="/downloadAll.js" defer />
        </BaseHtml>
      );
    },
  )
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, jwt, redirect, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect("/results");
      }
      // parse from url encoded string
      const userId = decodeURIComponent(params.userId);
      const jobId = decodeURIComponent(params.jobId);
      const fileName = decodeURIComponent(params.fileName);

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      return Bun.file(filePath);
    },
  )
  .get(
    "/zip/:userId/:jobId",
    async ({ params, jwt, redirect, cookie: { auth } }) => {
      // TODO: Implement zip download
      if (!auth?.value) {
        return redirect("/login");
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login");
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect("/results");
      }

      const userId = decodeURIComponent(params.userId);
      const jobId = decodeURIComponent(params.jobId);
      const outputPath = `${outputDir}${userId}/${jobId}/`;

      // return Bun.zip(outputPath);
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
