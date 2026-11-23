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
        password TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS file_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        output_file_name TEXT NOT NULL,
        status TEXT DEFAULT 'not started',
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
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
    let currentVersion = dbVersion?.user_version ?? 0;

    if (currentVersion < 1) {
      // Don't trust user_version alone — verify the column is actually
      // missing before altering. This makes the migration safe to re-run
      // even against a file left in an inconsistent state.
      const columns = db.query("PRAGMA table_info(file_names)").all() as { name: string }[];
      const hasStatusColumn = columns.some((c) => c.name.toLowerCase() === "status");

      if (!hasStatusColumn) {
        db.exec("ALTER TABLE file_names ADD COLUMN status TEXT DEFAULT 'not started';");
      }

      db.exec("PRAGMA user_version = 1;");
      currentVersion = 1;
      console.log("Updated database to version 1.");
    }

    if (currentVersion < 2) {
      const tableDef = db
        .query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'file_names'")
        .get() as { sql?: string } | null;
      const hasCascade = /\bON\s+DELETE\s+CASCADE\b/i.test(tableDef?.sql ?? "");

      db.transaction(() => {
        const hasSequenceTable = Boolean(
          db
            .query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'")
            .get(),
        );
        const previousSeqRow = hasSequenceTable
          ? (db.query("SELECT seq FROM sqlite_sequence WHERE name = 'file_names'").get() as {
              seq?: number;
            } | null)
          : null;

        db.exec("DELETE FROM file_names WHERE job_id NOT IN (SELECT id FROM jobs);");

        if (!hasCascade) {
          db.exec(`
            CREATE TABLE file_names_migrated (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              job_id INTEGER NOT NULL,
              file_name TEXT NOT NULL,
              output_file_name TEXT NOT NULL,
              status TEXT DEFAULT 'not started',
              FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
            );
            INSERT INTO file_names_migrated (id, job_id, file_name, output_file_name, status)
            SELECT id, job_id, file_name, output_file_name, status FROM file_names;
            DROP TABLE file_names;
            ALTER TABLE file_names_migrated RENAME TO file_names;
          `);

          if (previousSeqRow?.seq != null) {
            const maxRow = db
              .query("SELECT COALESCE(MAX(id), 0) AS maxId FROM file_names")
              .get() as { maxId: number };
            const preservedSeq = Math.max(previousSeqRow.seq, maxRow.maxId);
            db.query("DELETE FROM sqlite_sequence WHERE name = 'file_names'").run();
            db.query("INSERT INTO sqlite_sequence (name, seq) VALUES ('file_names', ?)").run(
              preservedSeq,
            );
          }
        }

        db.exec("PRAGMA user_version = 2;");
      })();
      console.log("Updated database to version 2.");
    }
  }

  // enable WAL mode
  db.exec("PRAGMA journal_mode = WAL;");
}

/** Delete a job and all of its associated `file_names` rows atomically. */
export function deleteJobRecord(database: Database, jobId: number): void {
  database.transaction(() => {
    database.query("DELETE FROM file_names WHERE job_id = ?").run(jobId);
    database.query("DELETE FROM jobs WHERE id = ?").run(jobId);
  })();
}

const dbPath = process.env.DB_PATH ?? "./data/mydb.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath, { create: true });
initializeDatabase(db);

export default db;
