import { createHash, randomBytes } from "node:crypto";

import db from "../db/db";

export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  /** The start of the key, shown so people can tell their keys apart. */
  prefix: string;
  date_created: string;
  last_used: string | null;
}

const KEY_PREFIX = "cvx_";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Creates a key. The key itself is returned once; only its hash is kept. */
export function createApiKey(
  userId: string | number,
  name: string,
): { key: string; apiKey: ApiKey } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const apiKey = db
    .query(
      `INSERT INTO api_keys (user_id, name, prefix, key_hash, date_created)
       VALUES (?1, ?2, ?3, ?4, ?5)
       RETURNING id, user_id, name, prefix, date_created, last_used`,
    )
    .get(
      userId,
      name.trim() || "API key",
      key.slice(0, 12),
      hashKey(key),
      new Date().toISOString(),
    ) as ApiKey;
  return { key, apiKey };
}

export function listApiKeys(userId: string | number): ApiKey[] {
  return db
    .query(
      "SELECT id, user_id, name, prefix, date_created, last_used FROM api_keys WHERE user_id = ? ORDER BY id DESC",
    )
    .all(userId) as ApiKey[];
}

/** Revokes a key. Returns `false` if the user has no such key. */
export function deleteApiKey(userId: string | number, id: string | number): boolean {
  return db.query("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

/** The user a key belongs to, or `null`. Records when the key was last used. */
export function userForApiKey(key: string): { id: string } | null {
  if (!key.startsWith(KEY_PREFIX)) return null;
  // Only keys of registered accounts count, never those of anonymous sessions.
  const row = db
    .query(
      `SELECT api_keys.id, api_keys.user_id, api_keys.last_used FROM api_keys
       JOIN users ON users.id = api_keys.user_id WHERE api_keys.key_hash = ?`,
    )
    .get(hashKey(key)) as { id: number; user_id: number; last_used: string | null } | null;
  if (!row) return null;
  // Writing on every request would be wasteful; a minute's precision is plenty.
  const now = Date.now();
  if (!row.last_used || now - Date.parse(row.last_used) > 60_000) {
    db.query("UPDATE api_keys SET last_used = ? WHERE id = ?").run(
      new Date(now).toISOString(),
      row.id,
    );
  }
  return { id: String(row.user_id) };
}
