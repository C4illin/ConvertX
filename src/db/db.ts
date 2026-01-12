import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

mkdirSync("./data", { recursive: true });
const db = new Database("./data/mydb.sqlite", { create: true });

if (!db.query("SELECT * FROM sqlite_master WHERE type='table'").get()) {
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
PRAGMA user_version = 1;`);
}

const dbVersion = (db.query("PRAGMA user_version").get() as { user_version?: number }).user_version;

// existing migration: add status column to file_names
if (dbVersion === 0) {
  db.exec("ALTER TABLE file_names ADD COLUMN status TEXT DEFAULT 'not started';");
  db.exec("PRAGMA user_version = 1;");
  console.log("Updated database to version 1.");
}

const userColumns = db.query("PRAGMA table_info(users)").all() as { name: string }[];
const hasRoleColumn = userColumns.some((col) => col.name === "role");
if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';");
  console.log("Added 'role' column to users table.");
}

// enable WAL mode
db.exec("PRAGMA journal_mode = WAL;");

export default db;
