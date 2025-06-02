import { rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";

import { Elysia } from "elysia";
import "./helpers/printVersions";
import { AUTO_DELETE_EVERY_N_HOURS, WEBROOT } from "./helpers/env";
import { user } from "./pages/user";
import { root } from "./pages/root"
import { upload } from "./pages/upload"
import { history } from "./pages/history";
import { convert } from "./pages/convert"
import { download } from "./pages/download"
import { results } from "./pages/results";
import { deleteFile } from "./pages/deleteFile";
import { listConverters } from "./pages/listConverters";
import { chooseConverter } from "./pages/chooseConverter";
import db from "./db/db";

mkdir("./data", { recursive: true }).catch(console.error);

export const uploadsDir = "./data/uploads/";
export const outputDir = "./data/output/";

// init db if not exists


export class Filename {
  id!: number;
  job_id!: number;
  file_name!: string;
  output_file_name!: string;
  status!: string;
}

export class Jobs {
  finished_files!: number;
  id!: number;
  user_id!: number;
  date_created!: string;
  status!: string;
  num_files!: number;
  files_detailed!: Filename[];
}

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
  .use(results)
  .use(deleteFile)
  .use(listConverters)
  .use(chooseConverter)
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
