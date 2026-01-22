import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

mkdirSync("./data", { recursive: true });
const db = new Database("./data/mydb.sqlite", { create: true });

function getTableInfo(tableName: string) {
  try {
    return db.query(`PRAGMA table_info('${tableName}')`).all() as Array<{ name: string}>;
  } catch (error) {
    console.error(`Error getting table info for ${tableName}:`, error)
    return [];
  }
}

function hasColumn(tableName: string, columnName: string) {
  const info = getTableInfo(tableName);
  return info.some((c) => c.name === columnName);
}

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
  storage_key TEXT, -- v2 column
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
-- Ensure storage_metadata exists for legacy DBs
CREATE TABLE IF NOT EXISTS storage_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

try {
  if (!hasColumn("file_names", "status")) {
    db.exec("ALTER TABLE file_names ADD COLUMN status TEXT DEFAULT 'not started';");
    console.log("Added column file_names.status");
  }

  if (!hasColumn("file_names", "storage_key")) {
    db.exec("ALTER TABLE file_names ADD COLUMN storage_key TEXT;");
    console.log("Added column file_names.storage_key");
  }

  const currentVersion = (db.query("PRAGMA user_version").get() as { user_version?: number}).user_version ?? 0;
  if (currentVersion < 2) {
    db.exec("PRAGMA user_version = 2;");
    console.log(`Updated database to version 2 (was ${currentVersion}).`);
  }
} catch (error) {
  console.error("Error running migrations: ", error);
}

// enable WAL mode
try {
  db.exec("PRAGMA journal_mode = WAL;");
} catch (error) {
  console.warn("Could not enable WAL mode: ", error);
}

export default db;
