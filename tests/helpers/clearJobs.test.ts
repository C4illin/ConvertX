import { afterAll, afterEach, expect, spyOn, test } from "bun:test";
import { Database } from "bun:sqlite";
import { clearExpiredJobs, startJobCleanup } from "../../src/helpers/clearJobs";

const consoleError = spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  consoleError.mockClear();
});

afterAll(() => {
  consoleError.mockRestore();
});

function setupDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date_created TEXT NOT NULL,
      status TEXT DEFAULT 'not started',
      num_files INTEGER DEFAULT 0
    );
  `);
  return db;
}

function insertJob(db: Database, userId: number, dateCreated: string): number {
  db.query("INSERT INTO jobs (user_id, date_created) VALUES (?, ?)").run(userId, dateCreated);
  const row = db.query("SELECT id FROM jobs ORDER BY id DESC").get() as { id: number };
  return row.id;
}

function jobIds(db: Database): number[] {
  return db
    .query("SELECT id FROM jobs ORDER BY id")
    .all()
    .map((row) => (row as { id: number }).id);
}

test("clearExpiredJobs continues when one job directory cannot be deleted", () => {
  const db = setupDb();
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const stuckId = insertJob(db, 1, old);
  const okId = insertJob(db, 1, old);
  const removed: string[] = [];

  clearExpiredJobs({
    db,
    outputDir: "./data/output/",
    uploadsDir: "./data/uploads/",
    olderThan: new Date(),
    rm: (path) => {
      if (path.endsWith(`/${stuckId}`)) {
        throw Object.assign(new Error("ENOTEMPTY: directory not empty"), { code: "ENOTEMPTY" });
      }
      removed.push(path);
    },
  });

  expect(jobIds(db)).toEqual([stuckId]);
  expect(removed).toContain(`./data/output/1/${okId}`);
  expect(removed).toContain(`./data/uploads/1/${okId}`);
});

test("startJobCleanup reschedules even when deletion throws", () => {
  const db = setupDb();
  insertJob(db, 1, new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  const scheduled: { delay: number }[] = [];
  startJobCleanup({
    db,
    outputDir: "./data/output/",
    uploadsDir: "./data/uploads/",
    intervalHours: 24,
    rm: () => {
      throw new Error("rmSync hung or failed");
    },
    schedule: (_callback, delay) => {
      scheduled.push({ delay });
      return 0;
    },
  });

  expect(scheduled).toHaveLength(1);
  expect(scheduled[0]?.delay).toBe(24 * 60 * 60 * 1000);
});

test("startJobCleanup reschedules when listing jobs throws", () => {
  const scheduled: { delay: number }[] = [];
  startJobCleanup({
    db: {
      query: () => {
        throw new Error("db unavailable");
      },
    } as unknown as Database,
    outputDir: "./data/output/",
    uploadsDir: "./data/uploads/",
    intervalHours: 24,
    schedule: (_callback, delay) => {
      scheduled.push({ delay });
      return 0;
    },
  });

  expect(scheduled).toHaveLength(1);
  expect(scheduled[0]?.delay).toBe(24 * 60 * 60 * 1000);
});
