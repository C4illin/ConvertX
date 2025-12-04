import { rmSync } from "node:fs";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import "./helpers/printVersions";
import db from "./db/db";
import { Jobs } from "./db/types";
import { AUTO_DELETE_EVERY_N_HOURS, WEBROOT } from "./helpers/env";
import { chooseConverter } from "./pages/chooseConverter";
import { convert } from "./pages/convert";
import { deleteFile } from "./pages/deleteFile";
import { deleteJob } from "./pages/deleteJob";
import { download } from "./pages/download";
import { history } from "./pages/history";
import { listConverters } from "./pages/listConverters";
import { results } from "./pages/results";
import { root } from "./pages/root";
import { upload } from "./pages/upload";
import { user } from "./pages/user";
import { healthcheck } from "./pages/healthcheck";
import { antivirus } from "./pages/antivirus"; // 👈 NEW

export const uploadsDir = "./data/uploads/";
export const outputDir = "./data/output/";

// Fix for Elysia issue with Bun, (see https://github.com/oven-sh/bun/issues/12161)
process.getBuiltinModule = require;

const app = new Elysia({
  serve: {
    maxRequestBodySize: Number.MAX_SAFE_INTEGER,
  },
  prefix: WEBROOT,
})
  .use(html())
  .use(
    staticPlugin({
      assets: "public",
      prefix: "",
    }),
  )
  .use(user)
  .use(root)
  .use(upload)
  .use(history)
  .use(convert)
  .use(download)
  .use(deleteJob)
  .use(results)
  .use(deleteFile)
  .use(listConverters)
  .use(chooseConverter)
  .use(healthcheck)
  .use(antivirus) // 👈 register the antivirus toggle API
  .onError(({ error }) => {
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
