import { openapi } from "@elysiajs/openapi";
import { Elysia, file, t } from "elysia";

import { getAllInputs, getAllTargets, getPossibleTargets } from "../converters/main";
import { WEBROOT } from "../helpers/env";
import { normalizeFiletype } from "../helpers/normalizeFiletype";
import {
  archiveJob,
  chooseConverter,
  cleanTarget,
  createJob,
  deleteJob,
  describeJob,
  listJobs,
  outputFile,
} from "./jobs";
import { userForApiKey } from "./keys";

const API_ROOT = `${WEBROOT}/api/v1`;

const ErrorBody = t.Object(
  {
    error: t.String({ description: "A stable code, such as `job_not_found`." }),
    message: t.String({ description: "What went wrong, for people." }),
  },
  { title: "Error" },
);

const JobFile = t.Object(
  {
    input: t.String({ description: "The uploaded file's name.", examples: ["report.docx"] }),
    status: t.Union([t.Literal("converting"), t.Literal("done"), t.Literal("failed")]),
    error: t.Optional(t.String({ description: "The converter's message when it failed." })),
    outputs: t.Array(
      t.Object({
        name: t.String({ examples: ["report.pdf"] }),
        url: t.String({ description: "Where to download it, with the same API key." }),
      }),
      { description: "Converted files. Converting a PDF to images makes one per page." },
    ),
  },
  { title: "JobFile" },
);

const Job = t.Object(
  {
    id: t.Number(),
    status: t.Union([t.Literal("pending"), t.Literal("completed"), t.Literal("failed")], {
      description: "`pending` until every file is converted.",
    }),
    createdAt: t.String({ format: "date-time" }),
    files: t.Array(JobFile),
  },
  { title: "Job" },
);

const JobSummary = t.Object(
  {
    id: t.Number(),
    status: t.String(),
    createdAt: t.String({ format: "date-time" }),
    files: t.Number({ description: "How many files were uploaded." }),
  },
  { title: "JobSummary" },
);

const unauthorized = {
  error: "unauthorized",
  message:
    "Send an API key as `Authorization: Bearer <key>`. Create one in ConvertX under Account → API keys.",
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Turns one file or several from a multipart form into a list. */
function asList(files: File | File[]): File[] {
  return Array.isArray(files) ? files : [files];
}

/**
 * The REST API at /api/v1, for scripts and automation. Authenticated with API keys, documented with
 * OpenAPI at /api/v1/docs.
 */
export const api = new Elysia({ name: "api", prefix: "/api/v1" })
  .use(
    openapi({
      path: "/docs",
      specPath: "/openapi.json",
      provider: "swagger-ui",
      // Only the API is documented, not the web pages.
      exclude: { paths: [new RegExp(`^(?!${escapeRegExp(API_ROOT)}/)`)], staticFile: true },
      documentation: {
        info: {
          title: "ConvertX API",
          version: "1",
          description:
            "Convert files between formats from scripts and automation tools. Create an API key in ConvertX under **Account → API keys** and send it as `Authorization: Bearer <key>`.\n\n" +
            "For one file, `POST /convert` uploads it and returns the result. For several, or for long conversions, `POST /jobs` starts a job you can follow with `GET /jobs/{id}`.",
        },
        components: {
          securitySchemes: {
            apiKey: { type: "http", scheme: "bearer", description: "An API key, starting `cvx_`." },
          },
        },
        security: [{ apiKey: [] }],
        tags: [
          { name: "Formats", description: "What can be converted into what." },
          { name: "Conversion", description: "Converting files." },
        ],
      },
    }),
  )
  .macro("apiKey", {
    async resolve({ headers, status }) {
      const authorization = headers.authorization ?? "";
      const key = /^bearer\s+/i.test(authorization)
        ? authorization.replace(/^bearer\s+/i, "").trim()
        : headers["x-api-key"];
      const user = key ? userForApiKey(key) : null;
      if (!user) return status(401, unauthorized);
      return { user };
    },
  })
  .get(
    "/converters",
    () => ({
      converters: Object.entries(getAllTargets()).map(([name, to]) => ({
        name,
        from: [...new Set(getAllInputs(name))].sort(),
        to: [...new Set(to)].sort(),
      })),
    }),
    {
      apiKey: true,
      response: {
        200: t.Object({
          converters: t.Array(
            t.Object({ name: t.String(), from: t.Array(t.String()), to: t.Array(t.String()) }),
          ),
        }),
        401: ErrorBody,
      },
      detail: {
        summary: "List converters",
        description: "Every converter and the formats it reads and writes.",
        tags: ["Formats"],
      },
    },
  )
  .get(
    "/targets",
    ({ query }) => {
      const from = normalizeFiletype(query.from.replace(/^\./, ""));
      const byFormat = new Map<string, string[]>();
      for (const [converter, targets] of Object.entries(getPossibleTargets(from))) {
        // A converter can list a format twice, such as LibreOffice's pdf.
        for (const target of new Set(targets))
          byFormat.set(target, [...(byFormat.get(target) ?? []), converter]);
      }
      return {
        from,
        targets: [...byFormat]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([format, converters]) => ({ format, converters })),
      };
    },
    {
      apiKey: true,
      query: t.Object({
        from: t.String({ description: "A file extension, such as `docx`.", examples: ["docx"] }),
      }),
      response: {
        200: t.Object({
          from: t.String(),
          targets: t.Array(t.Object({ format: t.String(), converters: t.Array(t.String()) })),
        }),
        401: ErrorBody,
      },
      detail: {
        summary: "List what a format can become",
        description:
          "The formats a file of this type can be converted to, and which converters can do it.",
        tags: ["Formats"],
      },
    },
  )
  .post(
    "/convert",
    async ({ body, user, set }) => {
      const to = cleanTarget(body.to);
      const converter = chooseConverter([body.file.name], to, body.converter);
      const { id, done } = await createJob(user.id, [body.file], to, converter);
      await done;
      const job = describeJob(user.id, id, API_ROOT);
      set.headers["x-convertx-job"] = String(id);
      const converted = job.files[0];
      if (!converted || converted.status !== "done") {
        set.status = 422;
        return {
          error: "conversion_failed",
          message: converted?.error ?? "The conversion failed.",
        };
      }
      // Several outputs, such as one image per PDF page, come back as a tar.
      const single = converted.outputs.length === 1 ? converted.outputs[0] : undefined;
      const path = single
        ? await outputFile(user.id, id, single.name)
        : await archiveJob(user.id, id);
      const name = single ? single.name : `converted_files_${id}.tar`;
      set.headers["content-disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
      return file(path);
    },
    {
      apiKey: true,
      body: t.Object({
        file: t.File({ description: "The file to convert." }),
        to: t.String({
          description: "The format to convert to, such as `pdf`.",
          examples: ["pdf"],
        }),
        converter: t.Optional(
          t.String({ description: "A converter to use. By default, the first that can do it." }),
        ),
      }),
      response: { 200: t.File(), 400: ErrorBody, 401: ErrorBody, 422: ErrorBody },
      detail: {
        summary: "Convert a file",
        description:
          "Uploads one file and returns the converted file once it's ready. The `X-ConvertX-Job` header gives the job, which stays in the history like any other.",
        tags: ["Conversion"],
      },
    },
  )
  .post(
    "/jobs",
    async ({ body, user, set }) => {
      const files = asList(body.files);
      const to = cleanTarget(body.to);
      const converter = chooseConverter(
        files.map((file) => file.name),
        to,
        body.converter,
      );
      const { id } = await createJob(user.id, files, to, converter);
      set.status = 202;
      set.headers.location = `${API_ROOT}/jobs/${id}`;
      return describeJob(user.id, id, API_ROOT);
    },
    {
      apiKey: true,
      body: t.Object({
        files: t.Files({ description: "One or more files, all converted to the same format." }),
        to: t.String({
          description: "The format to convert to, such as `pdf`.",
          examples: ["pdf"],
        }),
        converter: t.Optional(
          t.String({
            description: "A converter to use. By default, the first that handles every file.",
          }),
        ),
      }),
      response: { 202: Job, 400: ErrorBody, 401: ErrorBody, 422: ErrorBody },
      detail: {
        summary: "Start a conversion job",
        description:
          "Uploads files and starts converting them in the background. Follow the job with `GET /jobs/{id}`.",
        tags: ["Conversion"],
      },
    },
  )
  .get(
    "/jobs",
    ({ query, user }) => {
      const limit = query.limit ?? 20;
      const offset = query.offset ?? 0;
      const { jobs, total } = listJobs(user.id, limit, offset);
      return {
        total,
        jobs: jobs.map((job) => ({
          id: job.id,
          status: job.status,
          createdAt: job.date_created,
          files: job.num_files,
        })),
      };
    },
    {
      apiKey: true,
      query: t.Object({
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
        offset: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
      }),
      response: { 200: t.Object({ total: t.Number(), jobs: t.Array(JobSummary) }), 401: ErrorBody },
      detail: {
        summary: "List jobs",
        description: "Your jobs, newest first.",
        tags: ["Conversion"],
      },
    },
  )
  .get("/jobs/:id", ({ params, user }) => describeJob(user.id, params.id, API_ROOT), {
    apiKey: true,
    params: t.Object({ id: t.Numeric() }),
    response: { 200: Job, 401: ErrorBody, 404: ErrorBody },
    detail: {
      summary: "Get a job",
      description: "The job's progress and its converted files.",
      tags: ["Conversion"],
    },
  })
  .get(
    "/jobs/:id/files/:name",
    async ({ params, user, set }) => {
      const path = await outputFile(user.id, params.id, params.name);
      set.headers["content-disposition"] =
        `attachment; filename*=UTF-8''${encodeURIComponent(params.name)}`;
      return file(path);
    },
    {
      apiKey: true,
      params: t.Object({ id: t.Numeric(), name: t.String() }),
      response: { 200: t.File(), 401: ErrorBody, 404: ErrorBody },
      detail: { summary: "Download a converted file", tags: ["Conversion"] },
    },
  )
  .get(
    "/jobs/:id/archive",
    async ({ params, user, set }) => {
      const path = await archiveJob(user.id, params.id);
      set.headers["content-disposition"] =
        `attachment; filename="converted_files_${params.id}.tar"`;
      return file(path);
    },
    {
      apiKey: true,
      params: t.Object({ id: t.Numeric() }),
      response: { 200: t.File(), 401: ErrorBody, 404: ErrorBody },
      detail: {
        summary: "Download every converted file",
        description: "A tar of the job's converted files.",
        tags: ["Conversion"],
      },
    },
  )
  .delete(
    "/jobs/:id",
    ({ params, user, set }) => {
      deleteJob(user.id, params.id);
      set.status = 204;
    },
    {
      apiKey: true,
      params: t.Object({ id: t.Numeric() }),
      response: { 204: t.Void(), 401: ErrorBody, 404: ErrorBody },
      detail: {
        summary: "Delete a job",
        description: "Deletes the job, its uploads and its converted files.",
        tags: ["Conversion"],
      },
    },
  );
