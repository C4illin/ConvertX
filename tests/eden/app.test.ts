import { describe, expect, test } from "bun:test";

import { app } from "../../src/eden";

describe("eden app composition", () => {
  test("has all route endpoints mounted", async () => {
    // GET / — home page (root)
    const root = await app.handle(new Request("http://localhost/"));
    expect(root.status).toBeLessThan(500);

    // POST /conversions — chooseConverter (public endpoint, lists converters)
    const conversions = await app.handle(
      new Request("http://localhost/conversions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileType: "txt" }),
      }),
    );
    expect(conversions.status).toBe(200); // public endpoint, returns HTML fragment
  });

  test("POST /healthcheck returns ok", async () => {
    const res = await app.handle(new Request("http://localhost/healthcheck"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("POST /conversions normalizes file types", async () => {
    const txt = await app.handle(
      new Request("http://localhost/conversions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileType: "jpg" }),
      }),
    );
    const jpeg = await app.handle(
      new Request("http://localhost/conversions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileType: "jpeg" }),
      }),
    );

    expect(await txt.text()).toBe(await jpeg.text());
  });

  test("POST /delete requires session (auth macro)", async () => {
    const res = await app.handle(
      new Request("http://localhost/delete", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ filename: "test.txt" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test("GET /results/:jobId requires session (auth macro)", async () => {
    const res = await app.handle(new Request("http://localhost/results/1"));
    expect(res.status).toBe(401);
  });
});
