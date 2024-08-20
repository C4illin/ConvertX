import cookie from "@elysiajs/cookie";
import { html } from "@elysiajs/html";
import { jwt } from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { BaseHtml } from "./components/base";
import { Header } from "./components/header";
import {
  getAllInputs,
  getAllTargets,
  getPossibleTargets,
  mainConverter,
} from "./converters/main";
import {
  normalizeFiletype,
  normalizeOutputFiletype,
} from "./helpers/normalizeFiletype";
import "./helpers/printVersions";

mkdir("./data", { recursive: true }).catch(console.error);
const db = new Database("./data/mydb.sqlite", { create: true });
const uploadsDir = "./data/uploads/";
const outputDir = "./data/output/";

const ACCOUNT_REGISTRATION =
  process.env.ACCOUNT_REGISTRATION === "true" || false;

const HTTP_ALLOWED = process.env.HTTP_ALLOWED === "true" || false;

// fileNames: fileNames,
// filesToConvert: fileNames.length,
// convertedFiles : 0,
// outputFiles: [],

// init db if not exists
if (!db.query("SELECT * FROM sqlite_master WHERE type='table'").get()) {
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
  status TEXT DEFAULT 'not started',
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	date_created TEXT NOT NULL,
  status TEXT DEFAULT 'not started',
  num_files INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
PRAGMA user_version = 1;`);
}

const dbVersion = (
  db.query("PRAGMA user_version").get() as { user_version?: number }
).user_version;
if (dbVersion === 0) {
  db.exec(
    "ALTER TABLE file_names ADD COLUMN status TEXT DEFAULT 'not started';",
  );
  db.exec("PRAGMA user_version = 1;");
  console.log("Updated database to version 1.");
}

let FIRST_RUN = db.query("SELECT * FROM users").get() === null || false;

class User {
  id!: number;
  email!: string;
  password!: string;
}

class Filename {
  id!: number;
  job_id!: number;
  file_name!: string;
  output_file_name!: string;
  status!: string;
}

class Jobs {
  finished_files!: number;
  id!: number;
  user_id!: number;
  date_created!: string;
  status!: string;
  num_files!: number;
}

// enable WAL mode
db.exec("PRAGMA journal_mode = WAL;");

const app = new Elysia({
  serve: {
    maxRequestBodySize: Number.MAX_SAFE_INTEGER,
  },
})
  .use(cookie())
  .use(html())
  .use(
    jwt({
      name: "jwt",
      schema: t.Object({
        id: t.String(),
      }),
      secret: process.env.JWT_SECRET ?? randomUUID(),
      exp: "7d",
    }),
  )
  .use(
    staticPlugin({
      assets: "src/public/",
      prefix: "/",
    }),
  )
  .get("/setup", ({ redirect }) => {
    if (!FIRST_RUN) {
      return redirect("/login", 302);
    }

    return (
      <BaseHtml title="ConvertX | Setup">
        <main class="container">
          <h1>Welcome to ConvertX</h1>
          <article>
            <header>Create your account</header>
            <form method="post" action="/register">
              <fieldset>
                <label>
                  Email/Username
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
              <input type="submit" value="Create account" />
            </form>
            <footer>
              Report any issues on{" "}
              <a href="https://github.com/C4illin/ConvertX">GitHub</a>.
            </footer>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .get("/register", ({ redirect }) => {
    if (!ACCOUNT_REGISTRATION) {
      return redirect("/login", 302);
    }

    return (
      <BaseHtml title="ConvertX | Register">
        <>
          <Header accountRegistration={ACCOUNT_REGISTRATION} />
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
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      autocomplete="new-password"
                      required
                    />
                  </label>
                </fieldset>
                <input type="submit" value="Register" />
              </form>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  })
  .post(
    "/register",
    async ({ body, set, redirect, jwt, cookie: { auth } }) => {
      if (!ACCOUNT_REGISTRATION && !FIRST_RUN) {
        return redirect("/login", 302);
      }

      if (FIRST_RUN) {
        FIRST_RUN = false;
      }

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

      const user = db
        .query("SELECT * FROM users WHERE email = ?")
        .as(User)
        .get(body.email);

      if (!user) {
        set.status = 500;
        return {
          message: "Failed to create user.",
        };
      }

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
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect("/", 302);
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
  .get("/login", async ({ jwt, redirect, cookie: { auth } }) => {
    if (FIRST_RUN) {
      return redirect("/setup", 302);
    }

    // if already logged in, redirect to home
    if (auth?.value) {
      const user = await jwt.verify(auth.value);

      if (user) {
        return redirect("/", 302);
      }

      auth.remove();
    }

    return (
      <BaseHtml title="ConvertX | Login">
        <>
          <Header accountRegistration={ACCOUNT_REGISTRATION} />
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
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                </fieldset>
                <div role="group">
                  {ACCOUNT_REGISTRATION && (
                    <a href="/register" role="button" class="secondary">
                      Register an account
                    </a>
                  )}
                  <input type="submit" value="Login" />
                </div>
              </form>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  })
  .post(
    "/login",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      const existingUser = db
        .query("SELECT * FROM users WHERE email = ?")
        .as(User)
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
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect("/", 302);
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
  .get("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect("/login", 302);
  })
  .post("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect("/login", 302);
  })
  .get("/", async ({ jwt, redirect, cookie: { auth, jobId } }) => {
    if (FIRST_RUN) {
      return redirect("/setup", 302);
    }

    if (!auth?.value) {
      return redirect("/login", 302);
    }
    // validate jwt
    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login", 302);
    }

    // make sure user exists in db
    const existingUser = db
      .query("SELECT * FROM users WHERE id = ?")
      .as(User)
      .get(user.id);

    if (!existingUser) {
      if (auth?.value) {
        auth.remove();
      }
      return redirect("/login", 302);
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
      secure: !HTTP_ALLOWED,
      maxAge: 24 * 60 * 60,
      sameSite: "strict",
    });

    console.log("jobId set to:", id);

    return (
      <BaseHtml>
        <>
          <Header loggedIn />
          <main class="container">
            <article>
              <h1>Convert</h1>
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table id="file-list" class="striped" />
              </div>
              <input type="file" name="file" multiple />
              {/* <label for="convert_from">Convert from</label> */}
              {/* <select name="convert_from" aria-label="Convert from" required>
              <option selected disabled value="">
                Convert from
              </option>
              {getPossibleInputs().map((input) => (
                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                <option>{input}</option>
              ))}
            </select> */}
            </article>
            <form
              method="post"
              action="/convert"
              style={{ position: "relative" }}>
              <input type="hidden" name="file_names" id="file_names" />
              <article>
                <input
                  type="search"
                  name="convert_to_search"
                  placeholder="Search for conversions"
                  autocomplete="off"
                />

                <div class="select_container">
                  <article
                    class="convert_to_popup"
                    hidden
                    style={{
                      flexDirection: "column",
                      display: "flex",
                      zIndex: 2,
                      position: "absolute",
                      maxHeight: "50vh",
                      width: "90vw",
                      overflowY: "scroll",
                      margin: "0px",
                      overflowX: "hidden",
                    }}>
                    {Object.entries(getAllTargets()).map(
                      ([converter, targets]) => (
                        // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                        <article
                          class="convert_to_group"
                          data-converter={converter}
                          style={{
                            borderColor: "gray",
                            padding: "2px",
                          }}>
                          <header
                            style={{ fontSize: "20px", fontWeight: "bold" }}>
                            {converter}
                          </header>

                          <ul
                            class="convert_to_target"
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: "5px",
                              flexWrap: "wrap",
                            }}>
                            {targets.map((target) => (
                              // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                              <button
                                // https://stackoverflow.com/questions/121499/when-a-blur-event-occurs-how-can-i-find-out-which-element-focus-went-to#comment82388679_33325953
                                tabindex={0}
                                class="target"
                                data-value={`${target},${converter}`}
                                data-target={target}
                                data-converter={converter}
                                style={{ fontSize: "15px", padding: "5px" }}
                                type="button">
                                {target}
                              </button>
                            ))}
                          </ul>
                        </article>
                      ),
                    )}
                  </article>

                  {/* Hidden element which determines the format to convert the file too and the converter to use */}
                  <select
                    name="convert_to"
                    aria-label="Convert to"
                    required
                    hidden>
                    <option selected disabled value="">
                      Convert to
                    </option>
                    {Object.entries(getAllTargets()).map(
                      ([converter, targets]) => (
                        // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                        <optgroup label={converter}>
                          {targets.map((target) => (
                            // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                            <option value={`${target},${converter}`} safe>
                              {target}
                            </option>
                          ))}
                        </optgroup>
                      ),
                    )}
                  </select>
                </div>
              </article>
              <input type="submit" value="Convert" />
            </form>
          </main>
          <script src="script.js" defer />
        </>
      </BaseHtml>
    );
  })
  .post(
    "/conversions",
    ({ body }) => {
      return (
        <>
          <article
            class="convert_to_popup"
            hidden
            style={{
              flexDirection: "column",
              display: "flex",
              zIndex: 2,
              position: "absolute",
              maxHeight: "50vh",
              width: "90vw",
              overflowY: "scroll",
              margin: "0px",
              overflowX: "hidden",
            }}>
            {Object.entries(getPossibleTargets(body.fileType)).map(
              ([converter, targets]) => (
                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                <article
                  class="convert_to_group"
                  data-converter={converter}
                  style={{
                    borderColor: "gray",
                    padding: "2px",
                  }}>
                  <header style={{ fontSize: "20px", fontWeight: "bold" }}>
                    {converter}
                  </header>

                  <ul
                    class="convert_to_target"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "5px",
                      flexWrap: "wrap",
                    }}>
                    {targets.map((target) => (
                      // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                      <button
                        // https://stackoverflow.com/questions/121499/when-a-blur-event-occurs-how-can-i-find-out-which-element-focus-went-to#comment82388679_33325953
                        tabindex={0}
                        class="target"
                        data-value={`${target},${converter}`}
                        data-target={target}
                        data-converter={converter}
                        style={{ fontSize: "15px", padding: "5px" }}
                        type="button">
                        {target}
                      </button>
                    ))}
                  </ul>
                </article>
              ),
            )}
          </article>

          <select name="convert_to" aria-label="Convert to" required hidden>
            <option selected disabled value="">
              Convert to
            </option>
            {Object.entries(getPossibleTargets(body.fileType)).map(
              ([converter, targets]) => (
                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                <optgroup label={converter}>
                  {targets.map((target) => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                    <option value={`${target},${converter}`} safe>
                      {target}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </select>
        </>
      );
    },
    { body: t.Object({ fileType: t.String() }) },
  )
  .post(
    "/upload",
    async ({ body, redirect, jwt, cookie: { auth, jobId } }) => {
      if (!auth?.value) {
        return redirect("/login", 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      if (!jobId?.value) {
        return redirect("/", 302);
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect("/", 302);
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

      if (body?.file) {
        if (Array.isArray(body.file)) {
          for (const file of body.file) {
            await Bun.write(`${userUploadsDir}${file.name}`, file);
          }
        } else {
          // biome-ignore lint/complexity/useLiteralKeys: weird error
          await Bun.write(`${userUploadsDir}${body.file["name"]}`, body.file);
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
        return redirect("/login", 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      if (!jobId?.value) {
        return redirect("/", 302);
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect("/", 302);
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
        return redirect("/login", 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      if (!jobId?.value) {
        return redirect("/", 302);
      }

      const existingJob = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect("/", 302);
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

      const convertTo = normalizeFiletype(body.convert_to.split(",")[0] ?? "");
      const converterName = body.convert_to.split(",")[1];
      const fileNames = JSON.parse(body.file_names) as string[];

      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        return redirect("/", 302);
      }

      db.query(
        "UPDATE jobs SET num_files = ?1, status = 'pending' WHERE id = ?2",
      ).run(fileNames.length, jobId.value);

      const query = db.query(
        "INSERT INTO file_names (job_id, file_name, output_file_name, status) VALUES (?1, ?2, ?3, ?4)",
      );

      // Start the conversion process in the background
      Promise.all(
        fileNames.map(async (fileName) => {
          const filePath = `${userUploadsDir}${fileName}`;
          const fileTypeOrig = fileName.split(".").pop() ?? "";
          const fileType = normalizeFiletype(fileTypeOrig);
          const newFileExt = normalizeOutputFiletype(convertTo);
          const newFileName = fileName.replace(fileTypeOrig, newFileExt);
          const targetPath = `${userOutputDir}${newFileName}`;

          const result = await mainConverter(
            filePath,
            fileType,
            convertTo,
            targetPath,
            {},
            converterName,
          );
          if (jobId.value) {
            query.run(jobId.value, fileName, newFileName, result);
          }
        }),
      )
        .then(() => {
          // All conversions are done, update the job status to 'completed'
          if (jobId.value) {
            db.query("UPDATE jobs SET status = 'completed' WHERE id = ?1").run(
              jobId.value,
            );
          }

          // delete all uploaded files in userUploadsDir
          // rmSync(userUploadsDir, { recursive: true, force: true });
        })
        .catch((error) => {
          console.error("Error in conversion process:", error);
        });

      // Redirect the client immediately
      return redirect(`/results/${jobId.value}`, 302);
    },
    {
      body: t.Object({
        convert_to: t.String(),
        file_names: t.String(),
      }),
    },
  )
  .get("/history", async ({ jwt, redirect, cookie: { auth } }) => {
    if (!auth?.value) {
      return redirect("/login", 302);
    }
    const user = await jwt.verify(auth.value);

    if (!user) {
      return redirect("/login", 302);
    }

    let userJobs = db
      .query("SELECT * FROM jobs WHERE user_id = ?")
      .as(Jobs)
      .all(user.id);

    for (const job of userJobs) {
      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(job.id);

      job.finished_files = files.length;
    }

    // filter out jobs with no files
    userJobs = userJobs.filter((job) => job.num_files > 0);

    return (
      <BaseHtml title="ConvertX | Results">
        <>
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
                      <td safe>{job.date_created}</td>
                      <td>{job.num_files}</td>
                      <td>{job.finished_files}</td>
                      <td safe>{job.status}</td>
                      <td>
                        <a href={`/results/${job.id}`}>View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  })
  .get(
    "/results/:jobId",
    async ({ params, jwt, set, redirect, cookie: { auth, job_id } }) => {
      if (!auth?.value) {
        return redirect("/login", 302);
      }

      if (job_id?.value) {
        // clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return (
        <BaseHtml title="ConvertX | Result">
          <>
            <Header loggedIn />
            <main class="container">
              <article>
                <div class="grid">
                  <h1>Results</h1>
                  <div>
                    <button
                      type="button"
                      style={{ width: "10rem", float: "right" }}
                      onclick="downloadAll()"
                      {...(files.length !== job.num_files
                        ? { disabled: true, "aria-busy": "true" }
                        : "")}>
                      {files.length === job.num_files
                        ? "Download All"
                        : "Converting..."}
                    </button>
                  </div>
                </div>
                <progress max={job.num_files} value={files.length} />
                <table>
                  <thead>
                    <tr>
                      <th>Converted File Name</th>
                      <th>Status</th>
                      <th>View</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                      <tr>
                        <td safe>{file.output_file_name}</td>
                        <td safe>{file.status}</td>
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
            <script src="/results.js" defer />
          </>
        </BaseHtml>
      );
    },
  )
  .post(
    "/progress/:jobId",
    async ({ jwt, set, params, redirect, cookie: { auth, job_id } }) => {
      if (!auth?.value) {
        return redirect("/login", 302);
      }

      if (job_id?.value) {
        // clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return (
        <article>
          <div class="grid">
            <h1>Results</h1>
            <div>
              <button
                type="button"
                style={{ width: "10rem", float: "right" }}
                onclick="downloadAll()"
                {...(files.length !== job.num_files
                  ? { disabled: true, "aria-busy": "true" }
                  : "")}>
                {files.length === job.num_files
                  ? "Download All"
                  : "Converting..."}
              </button>
            </div>
          </div>
          <progress max={job.num_files} value={files.length} />
          <table>
            <thead>
              <tr>
                <th>Converted File Name</th>
                <th>Status</th>
                <th>View</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                <tr>
                  <td safe>{file.output_file_name}</td>
                  <td safe>{file.status}</td>
                  <td>
                    <a href={`/download/${outputPath}${file.output_file_name}`}>
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
      );
    },
  )
  .get(
    "/download/:userId/:jobId/:fileName",
    async ({ params, jwt, redirect, cookie: { auth } }) => {
      if (!auth?.value) {
        return redirect("/login", 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect("/results", 302);
      }
      // parse from url encoded string
      const userId = decodeURIComponent(params.userId);
      const jobId = decodeURIComponent(params.jobId);
      const fileName = decodeURIComponent(params.fileName);

      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;
      return Bun.file(filePath);
    },
  )
  .get("/converters", async ({ jwt, redirect, cookie: { auth } }) => {
    if (!auth?.value) {
      return redirect("/login", 302);
    }

    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect("/login", 302);
    }

    return (
      <BaseHtml title="ConvertX | Converters">
        <>
          <Header loggedIn />
          <main class="container">
            <article>
              <h1>Converters</h1>
              <table>
                <thead>
                  <tr>
                    <th>Converter</th>
                    <th>From (Count)</th>
                    <th>To (Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(getAllTargets()).map(
                    ([converter, targets]) => {
                      const inputs = getAllInputs(converter);
                      return (
                        // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                        <tr>
                          <td safe>{converter}</td>
                          <td>
                            Count: {inputs.length}
                            <ul>
                              {inputs.map((input) => (
                                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                                <li safe>{input}</li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            Count: {targets.length}
                            <ul>
                              {targets.map((target) => (
                                // biome-ignore lint/correctness/useJsxKeyInIterable: <explanation>
                                <li safe>{target}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  })
  .get(
    "/zip/:userId/:jobId",
    async ({ params, jwt, redirect, cookie: { auth } }) => {
      // TODO: Implement zip download
      if (!auth?.value) {
        return redirect("/login", 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect("/login", 302);
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect("/results", 302);
      }

      // const userId = decodeURIComponent(params.userId);
      // const jobId = decodeURIComponent(params.jobId);
      // const outputPath = `${outputDir}${userId}/${jobId}/`;

      // return Bun.zip(outputPath);
    },
  )
  .onError(({ error }) => {
    // log.error(` ${request.method} ${request.url}`, code, error);
    console.error(error);
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);

const clearJobs = () => {
  // clear all jobs older than 24 hours
  // get all files older than 24 hours
  const jobs = db
    .query("SELECT * FROM jobs WHERE date_created < ?")
    .as(Jobs)
    .all(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  for (const job of jobs) {
    // delete the directories
    rmSync(`${outputDir}${job.user_id}/${job.id}`, { recursive: true });
    rmSync(`${uploadsDir}${job.user_id}/${job.id}`, { recursive: true });

    // delete the job
    db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
  }

  // run every 24 hours
  setTimeout(clearJobs, 24 * 60 * 60 * 1000);
};
clearJobs();
