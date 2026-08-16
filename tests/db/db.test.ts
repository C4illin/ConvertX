import { test, expect, beforeEach, afterEach, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { unlinkSync, existsSync, mkdirSync } from "node:fs";

// set environment variable to ensure the test database is used instead of production data
process.env.DB_PATH = "./data/test-isolated.sqlite";

// dynamic import ensures that db.ts is loaded after the env is set
let initializeDatabase: (db: Database) => void;
let defaultDb: Database | undefined;
await import("../../src/db/db").then((mod) => {
  initializeDatabase = mod.initializeDatabase;
  defaultDb = mod.default as Database | undefined;
});

// Type-safe helpers for database query results
interface DbTable {
  name: string;
}

interface DbVersion {
  user_version?: number;
}

interface DbJournalMode {
  journal_mode?: string;
}

interface DbColumnInfo {
  name: string;
  type?: string;
}

interface DbUser {
  id?: number;
  email?: string;
}

function queryAllTables(database: Database): DbTable[] {
  return database
    .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as DbTable[];
}

function getDbVersion(database: Database): number | undefined {
  const result = database.query("PRAGMA user_version").get() as DbVersion;
  return result.user_version;
}

function getJournalMode(database: Database): string | undefined {
  const result = database.query("PRAGMA journal_mode").get() as DbJournalMode;
  return result.journal_mode;
}

function getColumnInfo(database: Database, table: string): DbColumnInfo[] {
  return database.query(`PRAGMA table_info(${table})`).all() as DbColumnInfo[];
}

// Test database initialization and migration paths
let testDbPath: string;
let testDb: Database;

beforeEach(() => {
  mkdirSync("./data", { recursive: true });
  testDbPath = `./data/test-db-${Date.now()}.sqlite`;
  testDb = new Database(testDbPath, { create: true });
  // Now uses the real initialization logic from db.ts
  initializeDatabase(testDb);
});

afterEach(() => {
  if (testDb) {
    testDb.close();
  }
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }
  if (existsSync(`${testDbPath}-wal`)) {
    try {
      unlinkSync(`${testDbPath}-wal`);
    } catch (err) {
      // WAL file cleanup error - log but don't fail test
      if (err instanceof Error && err.message.includes("ENOENT")) {
        // File already gone, which is fine
      }
    }
  }
  if (existsSync(`${testDbPath}-shm`)) {
    try {
      unlinkSync(`${testDbPath}-shm`);
    } catch (err) {
      // SHM file cleanup error - log but don't fail test
      if (err instanceof Error && err.message.includes("ENOENT")) {
        // File already gone, which is fine
      }
    }
  }
});

afterAll(() => {
  // Close the module-level default database before cleanup to prevent file lock errors
  if (defaultDb) {
    defaultDb.close();
  }
  // Cleanup of the isolated test database after the test run
  if (existsSync("./data/test-isolated.sqlite")) {
    unlinkSync("./data/test-isolated.sqlite");
  }
  if (existsSync("./data/test-isolated.sqlite-wal")) {
    try {
      unlinkSync("./data/test-isolated.sqlite-wal");
    } catch (err) {
      // WAL file cleanup error - log but don't fail test
      if (err instanceof Error && err.message.includes("ENOENT")) {
        // File already gone, which is fine
      }
    }
  }
  if (existsSync("./data/test-isolated.sqlite-shm")) {
    try {
      unlinkSync("./data/test-isolated.sqlite-shm");
    } catch (err) {
      // SHM file cleanup error - log but don't fail test
      if (err instanceof Error && err.message.includes("ENOENT")) {
        // File already gone, which is fine
      }
    }
  }
});

test("db initializes and creates tables on first run", () => {
  const tables = queryAllTables(testDb);
  expect(tables.length).toBeGreaterThanOrEqual(3);
  expect(tables.map((t) => t.name)).toContain("users");
  expect(tables.map((t) => t.name)).toContain("jobs");
  expect(tables.map((t) => t.name)).toContain("file_names");
  expect(getDbVersion(testDb)).toBe(1);
});

test("db handles migration from version 0 to version 1", () => {
  testDb.close();
  const migrateDbPath = `./data/test-db-migrate-${Date.now()}.sqlite`;
  const migrateDb = new Database(migrateDbPath, { create: true });

  try {
    // Simulates a real v0 database state
    migrateDb.exec(`
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
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date_created TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      PRAGMA user_version = 0;
    `);

    // Now runs the real migration logic from db.ts
    initializeDatabase(migrateDb);

    expect(getDbVersion(migrateDb)).toBe(1);
    const columnInfo = getColumnInfo(migrateDb, "file_names");
    expect(columnInfo.map((c) => c.name)).toContain("status");
  } finally {
    if (migrateDb) migrateDb.close();
    if (existsSync(migrateDbPath)) unlinkSync(migrateDbPath);
    if (existsSync(`${migrateDbPath}-wal`)) unlinkSync(`${migrateDbPath}-wal`);
    if (existsSync(`${migrateDbPath}-shm`)) unlinkSync(`${migrateDbPath}-shm`);
  }
});

test("db enables WAL mode", () => {
  expect(getJournalMode(testDb)?.toLowerCase()).toBe("wal");
});

test("db module exports a working database instance", () => {
  expect(defaultDb).toBeTruthy();
  const tables = queryAllTables(defaultDb!);
  expect(tables.length).toBeGreaterThanOrEqual(3);
  const tableNames = tables.map((t) => t.name);
  expect(tableNames).toContain("users");
  expect(tableNames).toContain("jobs");
  expect(tableNames).toContain("file_names");
});

test("db has correct schema with status column", () => {
  // Verify file_names table has the status column (created during initialization)
  const columns = getColumnInfo(testDb, "file_names");
  const columnNames = columns.map((c) => c.name);
  expect(columnNames).toContain("status");
  expect(columnNames).toContain("job_id");
  expect(columnNames).toContain("file_name");
  expect(columnNames).toContain("output_file_name");
});

test("db can insert and query data", () => {
  // Test that the database is functional
  // Insert a test user
  const stmt = testDb.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
  const result = stmt.run("test@example.com", "hashedpassword");
  // Verify that the insert happened (run() returns result object)
  expect(result).toBeTruthy();

  // Query the inserted user
  const user = testDb
    .query("SELECT * FROM users WHERE email = ?")
    .get("test@example.com") as DbUser;
  expect(user).toBeTruthy();
  expect(user.email).toBe("test@example.com");

  // Cleanup
  testDb.query("DELETE FROM users WHERE email = ?").run("test@example.com");
});
