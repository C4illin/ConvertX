import { randomInt, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import cookie from "@elysiajs/cookie";
import { html, Html } from "@elysiajs/html";
import { jwt, type JWTPayloadSpec } from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { Database } from "bun:sqlite";
import { Elysia, t } from "elysia";
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
  process.env.ACCOUNT_REGISTRATION?.toLowerCase() === "true" || false;

const HTTP_ALLOWED =
  process.env.HTTP_ALLOWED?.toLowerCase() === "true" || false;
const ALLOW_UNAUTHENTICATED =
  process.env.ALLOW_UNAUTHENTICATED?.toLowerCase() === "true" || false;
const AUTO_DELETE_EVERY_N_HOURS = process.env.AUTO_DELETE_EVERY_N_HOURS
  ? Number(process.env.AUTO_DELETE_EVERY_N_HOURS)
  : 24;

const WEBROOT = process.env.WEBROOT ?? "";

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
  prefix: WEBROOT,
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
      assets: "public",
      prefix: "",
    }),
  )
  .get("/test", () => {
    return (
      <html lang="en">
        <head>
          <title>Hello World</title>
        </head>
        <body>
          <h1>Hello</h1>
        </body>
      </html>
    );
  })
  .get("/setup", ({ redirect }) => {
    if (!FIRST_RUN) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml title="ConvertX | Setup" webroot={WEBROOT}>
        <main class="mx-auto w-full max-w-4xl px-4">
          <h1 class="my-8 text-3xl">Welcome to ConvertX!</h1>
          <article class="article p-0">
            <header class="w-full bg-neutral-800 p-4">
              Create your account
            </header>
            <form method="post" action={`${WEBROOT}/register`} class="p-4">
              <fieldset class="mb-4 flex flex-col gap-4">
                <label class="flex flex-col gap-1">
                  Email
                  <input
                    type="email"
                    name="email"
                    class="rounded-sm bg-neutral-800 p-3"
                    placeholder="Email"
                    autocomplete="email"
                    required
                  />
                </label>
                <label class="flex flex-col gap-1">
                  Password
                  <input
                    type="password"
                    name="password"
                    class="rounded-sm bg-neutral-800 p-3"
                    placeholder="Password"
                    autocomplete="current-password"
                    required
                  />
                </label>
              </fieldset>
              <input type="submit" value="Create account" class="btn-primary" />
            </form>
            <footer class="p-4">
              Report any issues on{" "}
              <a
                class={`
                  text-accent-500 underline
                  hover:text-accent-400
                `}
                href="https://github.com/C4illin/ConvertX"
              >
                GitHub
              </a>
              .
            </footer>
          </article>
        </main>
      </BaseHtml>
    );
  })
  .get("/register", ({ redirect }) => {
    if (!ACCOUNT_REGISTRATION) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Register">
        <>
          <Header
            webroot={WEBROOT}
            accountRegistration={ACCOUNT_REGISTRATION}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
          />
          <main class="w-full px-4">
            <article class="article">
              <form method="post" class="flex flex-col gap-4">
                <fieldset class="mb-4 flex flex-col gap-4">
                  <label class="flex flex-col gap-1">
                    Email
                    <input
                      type="email"
                      name="email"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Email"
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1">
                    Password
                    <input
                      type="password"
                      name="password"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Password"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                </fieldset>
                <input
                  type="submit"
                  value="Register"
                  class="btn-primary w-full"
                />
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
        return redirect(`${WEBROOT}/login`, 302);
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

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
  .get("/login", async ({ jwt, redirect, cookie: { auth } }) => {
    if (FIRST_RUN) {
      return redirect(`${WEBROOT}/setup`, 302);
    }

    // if already logged in, redirect to home
    if (auth?.value) {
      const user = await jwt.verify(auth.value);

      if (user) {
        return redirect(`${WEBROOT}/`, 302);
      }

      auth.remove();
    }

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Login">
        <>
          <Header
            webroot={WEBROOT}
            accountRegistration={ACCOUNT_REGISTRATION}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
          />
          <main class="w-full px-4">
            <article class="article">
              <form method="post" class="flex flex-col gap-4">
                <fieldset class="mb-4 flex flex-col gap-4">
                  <label class="flex flex-col gap-1">
                    Email
                    <input
                      type="email"
                      name="email"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Email"
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1">
                    Password
                    <input
                      type="password"
                      name="password"
                      class="rounded-sm bg-neutral-800 p-3"
                      placeholder="Password"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                </fieldset>
                <div role="group">
                  {ACCOUNT_REGISTRATION ? (
                    <a
                      href={`${WEBROOT}/register`}
                      role="button"
                      class="btn-primary w-full"
                    >
                      Register an account
                    </a>
                  ) : null}
                  <input
                    type="submit"
                    value="Login"
                    class="btn-primary w-full"
                  />
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

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )
  .get("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .post("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .get("/", async ({ jwt, redirect, cookie: { auth, jobId } }) => {
    if (!ALLOW_UNAUTHENTICATED) {
      if (FIRST_RUN) {
        return redirect(`${WEBROOT}/setup`, 302);
      }

      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }
    }

    // validate jwt
    let user: ({ id: string } & JWTPayloadSpec) | false = false;
    if (ALLOW_UNAUTHENTICATED) {
      const newUserId = String(
        randomInt(
          2 ** 24,
          Math.min(2 ** 48 + 2 ** 24 - 1, Number.MAX_SAFE_INTEGER),
        ),
      );
      const accessToken = await jwt.sign({
        id: newUserId,
      });

      user = { id: newUserId };
      if (!auth) {
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 24 * 60 * 60,
        sameSite: "strict",
      });
    } else if (auth?.value) {
      user = await jwt.verify(auth.value);

      if (user !== false && user.id) {
        if (Number.parseInt(user.id) < 2 ** 24 || !ALLOW_UNAUTHENTICATED) {
          // make sure user exists in db
          const existingUser = db
            .query("SELECT * FROM users WHERE id = ?")
            .as(User)
            .get(user.id);

          if (!existingUser) {
            if (auth?.value) {
              auth.remove();
            }
            return redirect(`${WEBROOT}/login`, 302);
          }
        }
      }
    }

    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
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
      <BaseHtml webroot={WEBROOT}>
        <>
          <Header
            webroot={WEBROOT}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            loggedIn
          />
          <main class="w-full px-4">
            <article class="article">
              <h1 class="mb-4 text-xl">Convert</h1>
              <div class="mb-4 max-h-[50vh] overflow-y-auto scrollbar-thin">
                <table
                  id="file-list"
                  class={`
                    w-full table-auto rounded bg-neutral-900
                    [&_td]:p-4
                    [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                  `}
                />
              </div>
              <div
                id="dropzone"
                class={`
                  relative flex h-48 w-full items-center justify-center rounded border border-dashed
                  border-neutral-700 transition-all
                  [&.dragover]:border-4 [&.dragover]:border-neutral-500
                  hover:border-neutral-600
                `}
              >
                <span>
                  <b>Choose a file</b> or drag it here
                </span>
                <input
                  type="file"
                  name="file"
                  multiple
                  class="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </div>
            </article>
            <form
              method="post"
              action={`${WEBROOT}/convert`}
              class="relative mx-auto mb-[35vh] w-full max-w-4xl"
            >
              <input type="hidden" name="file_names" id="file_names" />
              <article class="article w-full">
                <input
                  type="search"
                  name="convert_to_search"
                  placeholder="Search for conversions"
                  autocomplete="off"
                  class="w-full rounded-sm bg-neutral-800 p-4"
                />
                <div class="select_container relative">
                  <article
                    class={`
                      convert_to_popup absolute z-2 m-0 hidden h-[30vh] max-h-[50vh] w-full flex-col
                      overflow-x-hidden overflow-y-auto rounded bg-neutral-800
                      sm:h-[30vh]
                    `}
                  >
                    {Object.entries(getAllTargets()).map(
                      ([converter, targets]) => (
                        <article
                          class={`
                            convert_to_group flex w-full flex-col border-b border-neutral-700 p-4
                          `}
                          data-converter={converter}
                        >
                          <header class="mb-2 w-full text-xl font-bold" safe>
                            {converter}
                          </header>
                          <ul class="convert_to_target flex flex-row flex-wrap gap-1">
                            {targets.map((target) => (
                              <button
                                // https://stackoverflow.com/questions/121499/when-a-blur-event-occurs-how-can-i-find-out-which-element-focus-went-to#comment82388679_33325953
                                tabindex={0}
                                class={`
                                  target rounded bg-neutral-700 p-1 text-base
                                  hover:bg-neutral-600
                                `}
                                data-value={`${target},${converter}`}
                                data-target={target}
                                data-converter={converter}
                                type="button"
                                safe
                              >
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
                    hidden
                  >
                    <option selected disabled value="">
                      Convert to
                    </option>
                    {Object.entries(getAllTargets()).map(
                      ([converter, targets]) => (
                        <optgroup label={converter}>
                          {targets.map((target) => (
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
              <input
                class={`
                  btn-primary w-full
                  disabled:cursor-not-allowed disabled:opacity-50
                `}
                type="submit"
                value="Convert"
                disabled
              />
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
            class={`
              convert_to_popup absolute z-2 m-0 hidden h-[50vh] max-h-[50vh] w-full flex-col
              overflow-x-hidden overflow-y-auto rounded bg-neutral-800
              sm:h-[30vh]
            `}
          >
            {Object.entries(getPossibleTargets(body.fileType)).map(
              ([converter, targets]) => (
                <article
                  class="convert_to_group flex w-full flex-col border-b border-neutral-700 p-4"
                  data-converter={converter}
                >
                  <header class="mb-2 w-full text-xl font-bold" safe>
                    {converter}
                  </header>
                  <ul class="convert_to_target flex flex-row flex-wrap gap-1">
                    {targets.map((target) => (
                      <button
                        // https://stackoverflow.com/questions/121499/when-a-blur-event-occurs-how-can-i-find-out-which-element-focus-went-to#comment82388679_33325953
                        tabindex={0}
                        class={`
                          target rounded bg-neutral-700 p-1 text-base
                          hover:bg-neutral-600
                        `}
                        data-value={`${target},${converter}`}
                        data-target={target}
                        data-converter={converter}
                        type="button"
                        safe
                      >
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
                <optgroup label={converter}>
                  {targets.map((target) => (
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (!jobId?.value) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

      if (body?.file) {
        if (Array.isArray(body.file)) {
          for (const file of body.file) {
            await Bun.write(`${userUploadsDir}${file.name}`, file);
          }
        } else {
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (!jobId?.value) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const existingJob = await db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect(`${WEBROOT}/`, 302);
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (!jobId?.value) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const existingJob = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(jobId.value, user.id);

      if (!existingJob) {
        return redirect(`${WEBROOT}/`, 302);
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
        return redirect(`${WEBROOT}/`, 302);
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
          const newFileName = fileName.replace(
            new RegExp(`${fileTypeOrig}(?!.*${fileTypeOrig})`),
            newFileExt,
          );
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
      return redirect(`${WEBROOT}/results/${jobId.value}`, 302);
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
      return redirect(`${WEBROOT}/login`, 302);
    }
    const user = await jwt.verify(auth.value);

    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
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
      <BaseHtml webroot={WEBROOT} title="ConvertX | Results">
        <>
          <Header
            webroot={WEBROOT}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            loggedIn
          />
          <main class="w-full px-4">
            <article class="article">
              <h1 class="mb-4 text-xl">Results</h1>
              <table
                class={`
                  w-full table-auto rounded bg-neutral-900 text-left
                  [&_td]:p-4
                  [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                `}
              >
                <thead>
                  <tr>
                    <th class="px-4 py-2">Time</th>
                    <th class="px-4 py-2">Files</th>
                    <th class="px-4 py-2">Files Done</th>
                    <th class="px-4 py-2">Status</th>
                    <th class="px-4 py-2">View</th>
                  </tr>
                </thead>
                <tbody>
                  {userJobs.map((job) => (
                    <tr>
                      <td safe>{job.date_created}</td>
                      <td>{job.num_files}</td>
                      <td>{job.finished_files}</td>
                      <td safe>{job.status}</td>
                      <td>
                        <a
                          class={`
                            text-accent-500 underline
                            hover:text-accent-400
                          `}
                          href={`${WEBROOT}/results/${job.id}`}
                        >
                          View
                        </a>
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (job_id?.value) {
        // clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
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
        <BaseHtml webroot={WEBROOT} title="ConvertX | Result">
          <>
            <Header
              webroot={WEBROOT}
              allowUnauthenticated={ALLOW_UNAUTHENTICATED}
              loggedIn
            />
            <main class="w-full px-4">
              <article class="article">
                <div class="mb-4 flex items-center justify-between">
                  <h1 class="text-xl">Results</h1>
                  <div>
                    <button
                      type="button"
                      class="btn-primary float-right w-40"
                      onclick="downloadAll()"
                      {...(files.length !== job.num_files
                        ? { disabled: true, "aria-busy": "true" }
                        : "")}
                    >
                      {files.length === job.num_files
                        ? "Download All"
                        : "Converting..."}
                    </button>
                  </div>
                </div>
                <progress
                  max={job.num_files}
                  value={files.length}
                  class={`
                    mb-4 inline-block h-2 w-full appearance-none overflow-hidden rounded-full
                    border-0 bg-neutral-700 bg-none text-accent-500 accent-accent-500
                    [&::-moz-progress-bar]:bg-neutral-700 [&::-webkit-progress-value]:rounded-full
                    [&::-webkit-progress-value]:[background:none]
                    [&[value]::-webkit-progress-value]:bg-accent-500
                    [&[value]::-webkit-progress-value]:transition-[inline-size]
                  `}
                />
                <table
                  class={`
                    w-full table-auto rounded bg-neutral-900 text-left
                    [&_td]:p-4
                    [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                  `}
                >
                  <thead>
                    <tr>
                      <th class="px-4 py-2">Converted File Name</th>
                      <th class="px-4 py-2">Status</th>
                      <th class="px-4 py-2">View</th>
                      <th class="px-4 py-2">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr>
                        <td safe>{file.output_file_name}</td>
                        <td safe>{file.status}</td>
                        <td>
                          <a
                            class={`
                              text-accent-500 underline
                              hover:text-accent-400
                            `}
                            href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                          >
                            View
                          </a>
                        </td>
                        <td>
                          <a
                            class={`
                              text-accent-500 underline
                              hover:text-accent-400
                            `}
                            href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                            download={file.output_file_name}
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </main>
            <script src={`${WEBROOT}/results.js`} defer />
          </>
        </BaseHtml>
      );
    },
  )
  .post(
    "/progress/:jobId",
    async ({ jwt, set, params, redirect, cookie: { auth, job_id } }) => {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (job_id?.value) {
        // clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
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
        <article class="article">
          <div class="mb-4 flex items-center justify-between">
            <h1 class="text-xl">Results</h1>
            <div>
              <button
                type="button"
                class="btn-primary float-right w-40"
                onclick="downloadAll()"
                {...(files.length !== job.num_files
                  ? { disabled: true, "aria-busy": "true" }
                  : "")}
              >
                {files.length === job.num_files
                  ? "Download All"
                  : "Converting..."}
              </button>
            </div>
          </div>
          <progress
            max={job.num_files}
            value={files.length}
            class={`
              mb-4 inline-block h-2 w-full appearance-none overflow-hidden rounded-full border-0
              bg-neutral-700 bg-none text-accent-500 accent-accent-500
              [&::-moz-progress-bar]:bg-neutral-700 [&::-webkit-progress-value]:rounded-full
              [&::-webkit-progress-value]:[background:none]
              [&[value]::-webkit-progress-value]:bg-accent-500
              [&[value]::-webkit-progress-value]:transition-[inline-size]
            `}
          />
          <table
            class={`
              w-full table-auto rounded bg-neutral-900 text-left
              [&_td]:p-4
              [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
            `}
          >
            <thead>
              <tr>
                <th class="px-4 py-2">Converted File Name</th>
                <th class="px-4 py-2">Status</th>
                <th class="px-4 py-2">View</th>
                <th class="px-4 py-2">Download</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr>
                  <td safe>{file.output_file_name}</td>
                  <td safe>{file.status}</td>
                  <td>
                    <a
                      class={`
                        text-accent-500 underline
                        hover:text-accent-400
                      `}
                      href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                    >
                      View
                    </a>
                  </td>
                  <td>
                    <a
                      class={`
                        text-accent-500 underline
                        hover:text-accent-400
                      `}
                      href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                      download={file.output_file_name}
                    >
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
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
      return redirect(`${WEBROOT}/login`, 302);
    }

    const user = await jwt.verify(auth.value);
    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml webroot={WEBROOT} title="ConvertX | Converters">
        <>
          <Header
            webroot={WEBROOT}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            loggedIn
          />
          <main class="w-full px-4">
            <article class="article">
              <h1 class="mb-4 text-xl">Converters</h1>
              <table
                class={`
                  w-full table-auto rounded bg-neutral-900 text-left
                  [&_td]:p-4
                  [&_tr]:rounded-sm [&_tr]:border-b [&_tr]:border-neutral-800
                  [&_ul]:list-inside [&_ul]:list-disc
                `}
              >
                <thead>
                  <tr>
                    <th class="mx-4 my-2">Converter</th>
                    <th class="mx-4 my-2">From (Count)</th>
                    <th class="mx-4 my-2">To (Count)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(getAllTargets()).map(
                    ([converter, targets]) => {
                      const inputs = getAllInputs(converter);
                      return (
                        <tr>
                          <td safe>{converter}</td>
                          <td>
                            Count: {inputs.length}
                            <ul>
                              {inputs.map((input) => (
                                <li safe>{input}</li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            Count: {targets.length}
                            <ul>
                              {targets.map((target) => (
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
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return redirect(`${WEBROOT}/results`, 302);
      }

      // const userId = decodeURIComponent(params.userId);
      // const jobId = decodeURIComponent(params.jobId);
      // const outputPath = `${outputDir}${userId}/`{jobId}/);

      // return Bun.zip(outputPath);
    },
  )
  .onError(({ error }) => {
    // log.error(` ${request.method} ${request.url}`, code, error);
    console.error(error);
  });

if (process.env.NODE_ENV !== "production") {
  await import("./helpers/tailwind").then(async ({ generateTailwind }) => {
    const result = await generateTailwind();

    app.get("/generated.css", ({ set }) => {
      set.headers["content-type"] = "text/css";
      return result;
    });
  });
}

app.listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}${WEBROOT}`,
);

const clearJobs = () => {
  const jobs = db
    .query("SELECT * FROM jobs WHERE date_created < ?")
    .as(Jobs)
    .all(
      new Date(
        Date.now() - AUTO_DELETE_EVERY_N_HOURS * 60 * 60 * 1000,
      ).toISOString(),
    );

  for (const job of jobs) {
    // delete the directories
    rmSync(`${outputDir}${job.user_id}/${job.id}`, {
      recursive: true,
      force: true,
    });
    rmSync(`${uploadsDir}${job.user_id}/${job.id}`, {
      recursive: true,
      force: true,
    });

    // delete the job
    db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
  }

  setTimeout(clearJobs, AUTO_DELETE_EVERY_N_HOURS * 60 * 60 * 1000);
};

if (AUTO_DELETE_EVERY_N_HOURS > 0) {
  clearJobs();
}
