import { jwt } from "@elysiajs/jwt";
import { expect, test } from "bun:test";
import { Elysia } from "elysia";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import * as tar from "tar";
import db from "../../src/db/db";
import { download } from "../../src/pages/download";

test("download route blocks symlinks and serves normal files", async () => {
  const testUserId = 998;
  const testUserEmail = `download-test-${Date.now()}@example.com`;

  db.query("INSERT INTO users (id, email, password) VALUES (?, ?, ?)").run(
    testUserId,
    testUserEmail,
    "hashed_pwd",
  );

  const res = db
    .query(
      "INSERT INTO jobs (user_id, date_created, status, num_files) VALUES (?, ?, ?, ?) RETURNING id",
    )
    .get(testUserId, new Date().toISOString(), "completed", 1) as { id: number };
  const jobId = String(res.id);

  const jobDir = `./data/output/${testUserId}/${jobId}`;
  mkdirSync(jobDir, { recursive: true });
  writeFileSync(`${jobDir}/normal.txt`, "safe content");
  symlinkSync("/etc/passwd", `${jobDir}/symlink.txt`);

  try {
    const tokenApp = new Elysia()
      .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET ?? "secret", exp: "7d" }))
      .get("/token", async ({ jwt }) => jwt.sign({ id: String(testUserId) }));
    const tokenRes = await tokenApp.handle(new Request("http://localhost/token"));
    const token = await tokenRes.text();

    const app = new Elysia().use(download);

    // 1. Downloading normal file must succeed (200)
    const normalRes = await app.handle(
      new Request(`http://localhost/download/${testUserId}/${jobId}/normal.txt`, {
        headers: { cookie: `auth=${token}` },
      }),
    );
    expect(normalRes.status).toBe(200);
    expect(await normalRes.text()).toBe("safe content");

    // 2. Downloading a symlink must be blocked (403)
    const symlinkRes = await app.handle(
      new Request(`http://localhost/download/${testUserId}/${jobId}/symlink.txt`, {
        headers: { cookie: `auth=${token}` },
      }),
    );
    expect(symlinkRes.status).toBe(403);
    const body = (await symlinkRes.json()) as { message?: string };
    expect(body.message).toBe("Access denied.");

    // 3. Downloading non-existent file must return 404
    const notFoundRes = await app.handle(
      new Request(`http://localhost/download/${testUserId}/${jobId}/nonexistent.txt`, {
        headers: { cookie: `auth=${token}` },
      }),
    );
    expect(notFoundRes.status).toBe(404);

    // 4. Archive tarball must exclude symlinks
    const archiveRes = await app.handle(
      new Request(`http://localhost/archive/${jobId}`, {
        headers: { cookie: `auth=${token}` },
      }),
    );
    expect(archiveRes.status).toBe(200);

    const tarEntries: string[] = [];
    await tar.t({
      file: `${jobDir}/converted_files_${jobId}.tar`,
      onReadEntry: (e) => {
        tarEntries.push(e.path);
      },
    });

    expect(tarEntries).toContain("./normal.txt");
    expect(tarEntries).not.toContain("./symlink.txt");
  } finally {
    rmSync(`./data/output/${testUserId}`, { recursive: true, force: true });
    db.query("DELETE FROM jobs WHERE id = ?").run(jobId);
    db.query("DELETE FROM users WHERE id = ?").run(testUserId);
  }
});
