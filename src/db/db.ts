import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function initializeDatabase(db: Database): void {
  const dbVersion = db.query("PRAGMA user_version").get() as { user_version?: number };
  const hasTables = db.query("SELECT * FROM sqlite_master WHERE type='table'").get();

  if (!hasTables) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        external_id TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_external_id ON users(external_id);
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
    `);
    db.exec("PRAGMA user_version = 2;");
  } else {
    if ((dbVersion?.user_version ?? 0) < 1) {
      // Don't trust user_version alone — verify the column is actually
      // missing before altering. This makes the migration safe to re-run
      // even against a file left in an inconsistent state.
      const columns = db.query("PRAGMA table_info(file_names)").all() as { name: string }[];
      const hasStatusColumn = columns.some((c) => c.name.toLowerCase() === "status");

      if (!hasStatusColumn) {
        db.exec("ALTER TABLE file_names ADD COLUMN status TEXT DEFAULT 'not started';");
      }

      db.exec("PRAGMA user_version = 1;");
      console.log("Updated database to version 1.");
    }

    // Version 2: an SSO identity is stored as the original proxy value, so the
    // user id stays an ordinary autoincrement integer and the identity remains
    // recoverable. Same guard: check the column, not only user_version.
    const userColumns = db.query("PRAGMA table_info(users)").all() as { name: string }[];
    if (!userColumns.some((c) => c.name.toLowerCase() === "external_id")) {
      db.exec("ALTER TABLE users ADD COLUMN external_id TEXT;");
      console.log("Updated database to version 2.");
    }

    // Outside the guard on purpose. A process killed between the ALTER and the
    // CREATE leaves the column present but the index missing; the guard above
    // then skips the block forever and ensureSsoUser's INSERT OR IGNORE loses the
    // one-row-per-identity guarantee it relies on. Creating it every start is
    // idempotent and cheap.
    //
    // A file that already holds duplicate external_ids (the same crash window, with two
    // concurrent first sightings) makes CREATE UNIQUE INDEX throw. Losing the index is a
    // dedup failure; refusing to boot is an outage, so report the duplicates and carry on
    // — `ensureSsoUser` still fails closed on a row that is not there.
    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_external_id ON users(external_id);");
    } catch (error) {
      const duplicates = db
        .query(
          "SELECT external_id, COUNT(*) AS n FROM users WHERE external_id IS NOT NULL GROUP BY external_id HAVING n > 1",
        )
        .all() as { external_id: string; n: number }[];
      console.error(
        `Could not create the unique index on users.external_id: ${(error as Error).message}. ` +
          `Duplicate identities: ${duplicates.map((d) => `${d.external_id} x${d.n}`).join(", ") || "none found"}.`,
      );
    }

    // Set the version even when the column already existed (a file can carry
    // the schema without the matching user_version, e.g. after a crash mid-run),
    // but never lower it: a file written by a later build keeps its version, so
    // rolling back and forward again does not re-run migrations.
    if ((dbVersion?.user_version ?? 0) < 2) {
      db.exec("PRAGMA user_version = 2;");
    }
  }

  // enable WAL mode
  db.exec("PRAGMA journal_mode = WAL;");
}

const dbPath = process.env.DB_PATH ?? "./data/mydb.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath, { create: true });
initializeDatabase(db);

export default db;
