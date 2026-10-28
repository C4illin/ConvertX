import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";

import { getAllInputs, getAllTargets, getPossibleTargets } from "../converters/main";
import { WEBROOT } from "../helpers/env";
import { normalizeFiletype } from "../helpers/normalizeFiletype";
import {
  ApiError,
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
      description:
        "`pending` until every file is converted, then `completed`, or `failed` if any file failed. Each file has its own status.",
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

/**
 * A file as a download. A plain Response passes through Elysia untouched, unlike its file() helper,
 * which the minified build in the Docker image sends as "[object Object]".
 */
function download(path: string, name: string, headers: Record<string, string> = {}): Response {
  return new Response(Bun.file(path), {
    headers: {
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      ...headers,
    },
  });
}

/** Turns one file or several from a multipart form into a list. */
function asList(files: File | File[]): File[] {
  return Array.isArray(files) ? files : [files];
}

/** An error in the API's `{ error, message }` shape. */
function errorResponse(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status });
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
    // Headers come from `request`: Elysia decides whether to parse `headers` by reading
    // this function's source, which the minified build in the Docker image hides from it.
    async resolve({ request, status }) {
      const authorization = request.headers.get("authorization") ?? "";
      const key = /^bearer\s+/i.test(authorization)
        ? authorization.replace(/^bearer\s+/i, "").trim()
        : request.headers.get("x-api-key");
      const user = key ? userForApiKey(key) : null;
      if (!user) return status(401, unauthorized);
      return { user };
    },
  })
  // Every API error is JSON in the shape the docs describe, including Elysia's own validation and
  // parse errors. The app's error handler is registered after the API, so it never sees these.
  .onError(({ code, error }) => {
    if (error instanceof ApiError) return error.toResponse();
    if (code === "VALIDATION") {
      const field = error.valueError?.path.slice(1);
      return errorResponse(
        400,
        "invalid_request",
        `${field ? `"${field}"` : "The request"} is missing or not valid. ${API_ROOT}/docs describes what each endpoint takes.`,
      );
    }
    if (code === "PARSE") {
      return errorResponse(400, "invalid_request", "The request body couldn't be read.");
    }
    console.error(error);
    return errorResponse(
      500,
      "internal_error",
      "Something went wrong. The server log has details.",
    );
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
        400: ErrorBody,
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
    async ({ body, user }) => {
      const to = cleanTarget(body.to);
      const converter = chooseConverter([body.file.name], to, body.converter);
      const { id, done } = await createJob(user.id, [body.file], to, converter);
      await done;
      const job = describeJob(user.id, id, API_ROOT);
      const converted = job.files[0];
      if (!converted || converted.status !== "done") {
        return Response.json(
          { error: "conversion_failed", message: converted?.error ?? "The conversion failed." },
          { status: 422, headers: { "x-convertx-job": String(id) } },
        );
      }
      // Several outputs, such as one image per PDF page, come back as a tar.
      const single = converted.outputs.length === 1 ? converted.outputs[0] : undefined;
      const path = single
        ? await outputFile(user.id, id, single.name)
        : await archiveJob(user.id, id);
      const name = single ? single.name : `converted_files_${id}.tar`;
      return download(path, name, { "x-convertx-job": String(id) });
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
      response: {
        200: t.Object({ total: t.Number(), jobs: t.Array(JobSummary) }),
        400: ErrorBody,
        401: ErrorBody,
      },
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
    response: { 200: Job, 400: ErrorBody, 401: ErrorBody, 404: ErrorBody },
    detail: {
      summary: "Get a job",
      description: "The job's progress and its converted files.",
      tags: ["Conversion"],
    },
  })
  .get(
    "/jobs/:id/files/:name",
    async ({ params, user }) => {
      const path = await outputFile(user.id, params.id, params.name);
      return download(path, params.name);
    },
    {
      apiKey: true,
      params: t.Object({ id: t.Numeric(), name: t.String() }),
      response: { 200: t.File(), 400: ErrorBody, 401: ErrorBody, 404: ErrorBody },
      detail: { summary: "Download a converted file", tags: ["Conversion"] },
    },
  )
  .get(
    "/jobs/:id/archive",
    async ({ params, user }) => {
      const path = await archiveJob(user.id, params.id);
      return download(path, `converted_files_${params.id}.tar`);
    },
    {
      apiKey: true,
      params: t.Object({ id: t.Numeric() }),
      response: { 200: t.File(), 400: ErrorBody, 401: ErrorBody, 404: ErrorBody },
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
      response: { 204: t.Void(), 400: ErrorBody, 401: ErrorBody, 404: ErrorBody },
      detail: {
        summary: "Delete a job",
        description: "Deletes the job, its uploads and its converted files.",
        tags: ["Conversion"],
      },
    },
  )
  // Without this, unknown API paths would get the web interface's plain-text 404.
  .all(
    "/*",
    ({ request }) =>
      errorResponse(
        404,
        "not_found",
        `There's no ${request.method} ${new URL(request.url).pathname}. ${API_ROOT}/docs lists every endpoint.`,
      ),
    { detail: { hide: true } },
  );
