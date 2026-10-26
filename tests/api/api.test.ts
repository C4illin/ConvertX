import { beforeAll, describe, expect, test } from "bun:test";

import { Elysia } from "elysia";

if (!process.env.CONVERTX_TEST_ROOT) {
  // Without tests/preload.ts the API would use ./data/mydb.sqlite and write into ./data.
  throw new Error("API tests must run via `bun test` so that tests/preload.ts is loaded.");
}

// dynamic imports ensure that the guard above runs before the API is loaded
const { default: db } = await import("../../src/db/db");
const { api } = await import("../../src/api");
const { createApiKey, deleteApiKey, listApiKeys } = await import("../../src/api/keys");

// Some page, to check the API docs leave the web UI out.
const app = new Elysia().get("/history", () => "history page").use(api);

const vcard = (name: string, email: string) =>
  `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nN:${name.split(" ")[1]};${name.split(" ")[0]}\nEMAIL:${email}\nEND:VCARD\n`;

function addUser(email: string): string {
  const row = db
    .query("INSERT INTO users (email, password) VALUES (?, 'not-used') RETURNING id")
    .get(email) as { id: number };
  return String(row.id);
}

const alice = addUser("alice@example.com");
const bob = addUser("bob@example.com");
const aliceKey = createApiKey(alice, "tests").key;
const bobKey = createApiKey(bob, "tests").key;

function call(path: string, init: RequestInit & { key?: string | null } = {}) {
  const { key = aliceKey, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (key) headers.set("authorization", `Bearer ${key}`);
  return app.handle(new Request(`http://localhost/api/v1${path}`, { ...rest, headers }));
}

function form(fields: Record<string, string | File | File[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

async function waitForJob(id: number) {
  for (let i = 0; i < 100; i++) {
    const job = await (await call(`/jobs/${id}`)).json();
    if (job.status !== "pending") return job;
    await Bun.sleep(20);
  }
  throw new Error(`Job ${id} didn't finish`);
}

describe("authentication", () => {
  test("rejects requests without a valid key", async () => {
    for (const key of [null, "cvx_not-a-real-key", "not-even-the-format"]) {
      const response = await call("/converters", { key });
      expect(response.status).toBe(401);
      expect((await response.json()).error).toBe("unauthorized");
    }
  });

  test("accepts the key as a bearer token or in X-API-Key", async () => {
    expect((await call("/converters")).status).toBe(200);
    expect(
      (await call("/converters", { key: null, headers: { "x-api-key": aliceKey } })).status,
    ).toBe(200);
  });

  test("stores only a hash of each key, and revoking one locks it out", async () => {
    const { key, apiKey } = createApiKey(alice, "temporary");
    const stored = JSON.stringify(db.query("SELECT * FROM api_keys").all());
    expect(stored).not.toContain(key);
    expect(apiKey.prefix).toBe(key.slice(0, 12));
    expect((await call("/converters", { key })).status).toBe(200);
    expect(listApiKeys(alice).find((entry) => entry.id === apiKey.id)?.last_used).toBeTruthy();
    expect(deleteApiKey(bob, apiKey.id)).toBe(false);
    expect(deleteApiKey(alice, apiKey.id)).toBe(true);
    expect((await call("/converters", { key })).status).toBe(401);
  });
});

describe("formats", () => {
  test("lists converters with what they read and write", async () => {
    const { converters } = await (await call("/converters")).json();
    expect(converters).toContainEqual({ name: "vcf", from: ["vcf"], to: ["csv"] });
  });

  test("lists what a format can become", async () => {
    expect(await (await call("/targets?from=.VCF")).json()).toEqual({
      from: "vcf",
      targets: [{ format: "csv", converters: ["vcf"] }],
    });
  });

  test("names each converter once per format", async () => {
    // LibreOffice lists pdf among both its document and its spreadsheet targets.
    const { targets } = await (await call("/targets?from=docx")).json();
    for (const { converters } of targets) expect(converters).toEqual([...new Set(converters)]);
  });
});

describe("converting one file", () => {
  test("returns the converted file", async () => {
    const response = await call("/convert", {
      method: "POST",
      body: form({
        file: new File([vcard("Ada Lovelace", "ada@example.com")], "contacts.vcf"),
        to: "csv",
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename*=UTF-8''contacts.csv",
    );
    expect(response.headers.get("x-convertx-job")).toMatch(/^\d+$/);
    const csv = await response.text();
    expect(csv).toContain("Ada");
    expect(csv).toContain("ada@example.com");
  });

  test("explains a conversion no converter can do", async () => {
    const response = await call("/convert", {
      method: "POST",
      body: form({ file: new File(["x"], "contacts.vcf"), to: "pdf" }),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "unsupported_conversion",
      message:
        "No converter turns .vcf into .pdf. GET /api/v1/targets?from=vcf lists what each type can become.",
    });
  });

  test("names the converters that can, when the one asked for can't", async () => {
    const response = await call("/convert", {
      method: "POST",
      body: form({ file: new File(["x"], "contacts.vcf"), to: "csv", converter: "ffmpeg" }),
    });
    expect(await response.json()).toEqual({
      error: "unsupported_conversion",
      message: "ffmpeg can't convert .vcf to .csv. Converters that can: vcf.",
    });
  });

  test("reports a failed conversion", async () => {
    // The test environment has no image tools, so this one fails like a broken install would.
    const response = await call("/convert", {
      method: "POST",
      body: form({ file: new File([new Uint8Array([137, 80, 78, 71])], "pixel.png"), to: "jpg" }),
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("conversion_failed");
  });

  test("rejects a format that looks like a path", async () => {
    const response = await call("/convert", {
      method: "POST",
      body: form({ file: new File(["x"], "contacts.vcf"), to: "../csv" }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_format");
  });
});

describe("jobs", () => {
  let id: number;

  beforeAll(async () => {
    const response = await call("/jobs", {
      method: "POST",
      body: form({
        files: [
          new File([vcard("Ada Lovelace", "ada@example.com")], "team.vcf"),
          new File([vcard("Grace Hopper", "grace@example.com")], "more team.vcf"),
        ],
        to: "csv",
      }),
    });
    expect(response.status).toBe(202);
    const job = await response.json();
    id = job.id;
    expect(response.headers.get("location")).toBe(`/api/v1/jobs/${id}`);
  });

  test("converts every file and links each result", async () => {
    const job = await waitForJob(id);
    expect(job).toMatchObject({
      id,
      status: "completed",
      files: [
        {
          input: "more team.vcf",
          status: "done",
          outputs: [{ name: "more team.csv", url: `/api/v1/jobs/${id}/files/more%20team.csv` }],
        },
        {
          input: "team.vcf",
          status: "done",
          outputs: [{ name: "team.csv", url: `/api/v1/jobs/${id}/files/team.csv` }],
        },
      ],
    });
  });

  test("downloads one result, or all of them as a tar", async () => {
    await waitForJob(id);
    const one = await call(`/jobs/${id}/files/more%20team.csv`);
    expect(one.status).toBe(200);
    expect(await one.text()).toContain("grace@example.com");

    // Twice, as the first archive is saved next to the results and mustn't end up in the second.
    for (let i = 0; i < 2; i++) {
      const response = await call(`/jobs/${id}/archive`);
      const files = await new Bun.Archive(await response.arrayBuffer()).files();
      expect([...files.keys()].sort()).toEqual(["more team.csv", "team.csv"]);
      expect(await files.get("team.csv")?.text()).toContain("ada@example.com");
    }
  });

  test("lists jobs, newest first", async () => {
    const { total, jobs } = await (await call("/jobs?limit=1")).json();
    expect(total).toBeGreaterThanOrEqual(2);
    expect(jobs).toHaveLength(1);
  });

  test("keeps jobs private to their owner", async () => {
    for (const path of [`/jobs/${id}`, `/jobs/${id}/files/team.csv`, `/jobs/${id}/archive`]) {
      const response = await call(path, { key: bobKey });
      expect(response.status).toBe(404);
      expect((await response.json()).error).toBe("job_not_found");
    }
    expect((await call(`/jobs/${id}`, { method: "DELETE", key: bobKey })).status).toBe(404);
  });

  test("rejects two files with the same name", async () => {
    const response = await call("/jobs", {
      method: "POST",
      body: form({ files: [new File(["a"], "same.vcf"), new File(["b"], "same.vcf")], to: "csv" }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("duplicate_file_name");
  });

  test("rejects two files that would get the same output name", async () => {
    // Otherwise the second logo.webp would overwrite the first.
    const response = await call("/jobs", {
      method: "POST",
      body: form({ files: [new File(["a"], "logo.png"), new File(["b"], "logo.svg")], to: "webp" }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "duplicate_output_name",
      message:
        '"logo.png" and "logo.svg" would both become "logo.webp". Rename one, or convert them in separate jobs.',
    });
  });

  test("deletes a job with its files", async () => {
    await waitForJob(id);
    expect((await call(`/jobs/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await call(`/jobs/${id}`)).status).toBe(404);
    expect(db.query("SELECT count(*) AS n FROM file_names WHERE job_id = ?").get(id)).toEqual({
      n: 0,
    });
  });
});

describe("documentation", () => {
  test("describes the API, and only the API, in OpenAPI", async () => {
    const response = await app.handle(new Request("http://localhost/api/v1/openapi.json"));
    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(Object.keys(spec.paths).sort()).toEqual([
      "/api/v1/convert",
      "/api/v1/converters",
      "/api/v1/jobs",
      "/api/v1/jobs/{id}",
      "/api/v1/jobs/{id}/archive",
      "/api/v1/jobs/{id}/files/{name}",
      "/api/v1/targets",
    ]);
    expect(spec.components.securitySchemes.apiKey).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  test("serves Swagger UI", async () => {
    const response = await app.handle(new Request("http://localhost/api/v1/docs"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("swagger-ui");
  });
});
