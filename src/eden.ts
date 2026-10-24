// Typed Elysia app + Eden client for type-safe clientside API access.
// This module composes all routes into a single Elysia instance so that
// @elysiajs/eden can generate fully typed client methods from them.

import { edenFetch } from "@elysiajs/eden";
import { html } from "@elysiajs/html";
import { Elysia } from "elysia";

import { chooseConverter } from "./pages/chooseConverter";
import { convert } from "./pages/convert";
import { deleteFile } from "./pages/deleteFile";
import { download } from "./pages/download";
import { healthcheck } from "./pages/healthcheck";
import { history } from "./pages/history";
import { listConverters } from "./pages/listConverters";
import { results } from "./pages/results";
import { root } from "./pages/root";
import { upload } from "./pages/upload";
import { user } from "./pages/user";

export const app = new Elysia()
  .use(html())
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
  .use(healthcheck);

// Generate typed client from the Elysia app definition.
export type App = typeof app;

// Re-export the Eden client creator so consumers can build their own client instance.
export type EdenAppClient = ReturnType<typeof edenFetch<App>>;
export const createEdenClient: (baseUrl: string) => EdenAppClient = edenFetch;
