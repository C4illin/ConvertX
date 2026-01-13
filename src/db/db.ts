import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

mkdirSync("./data", { recursive: true });
const db = new Database("./data/mydb.sqlite", { create: true });

// Always keep foreign keys on (SQLite defaults to off).
db.exec("PRAGMA foreign_keys = ON;");


const hasAnyTable = db.query("SELECT 1 FROM sqlite_master WHERE type='table' LIMIT 1").get();
if (!hasAnyTable) {
  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date_created TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  num_files INTEGER NOT NULL DEFAULT 0,
  finished_files INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  output_file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

PRAGMA user_version = 1;
`);
}

const dbVersion = (db.query("PRAGMA user_version").get() as { user_version?: number })
  .user_version;

if ((dbVersion ?? 0) === 0) {
  db.exec("PRAGMA user_version = 1;");
  console.log("Updated database to version 1.");
}

const userColumns = db.query("PRAGMA table_info(users)").all() as { name: string }[];
const hasRoleColumn = userColumns.some((col) => col.name === "role");

if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");

  const oldest = db
    .query("SELECT id FROM users ORDER BY id ASC LIMIT 1")
    .get() as { id: number } | null;

  if (oldest) {
    db.query("UPDATE users SET role = 'admin' WHERE id = ?").run(oldest.id);
    console.log("Added 'role' column; promoted oldest existing user to admin (Policy A).");
  } else {
    console.log("Added 'role' column to users table (no users to promote).");
  }
}

// enable WAL mode (better concurrency for Bun + SQLite)
db.exec("PRAGMA journal_mode = WAL;");

export default db;
