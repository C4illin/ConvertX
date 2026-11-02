import db from "../db/db";
import { SSO_UID_HEADER, SSO_USERNAME_HEADER } from "./env";

/** Anything longer is not an identity, it is abuse. */
const MAX_IDENTITY_LENGTH = 512;

/** Users.email is a TEXT column; a sane display name fits comfortably. */
const MAX_USERNAME_LENGTH = 255;

export type SsoIdentity = { externalId: string; username: string };

export type HeaderSource =
  Headers | Record<string, string | string[] | undefined> | undefined | null;

/**
 * Reads one header from either a WHATWG `Headers` instance (what `request.headers` is at runtime)
 * or a plain object (what the tests pass). Both shapes reach this function in practice; a compiled
 * build can hand a route no parsed `headers` at all, so call sites pass `request.headers` and this
 * function accepts either.
 */
function headerValue(headers: HeaderSource, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const lower = name.toLowerCase();

  if (typeof (headers as Headers).get === "function") {
    const value = (headers as Headers).get(lower);
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const direct = record[lower] ?? record[name];
  if (Array.isArray(direct)) {
    return direct[0];
  }
  if (typeof direct === "string") {
    return direct;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return undefined;
}

/**
 * Reads the identity of a request from the headers the reverse proxy sets.
 *
 * The header name is configurable because the proxy decides it; the values to trust are documented
 * per deployment (Traefik replaces only the headers listed in `authResponseHeaders`, and a network
 * restriction keeps clients off the app port). Nothing here is a substitute for that.
 *
 * A comma means the proxy appended a second value instead of replacing the client's: `"<victim>,
 * <attacker>"` is not an identity, and hashing it would silently mint a new user, making the
 * original user's history "disappear". Reject it.
 */
export function resolveSsoIdentity(headers: HeaderSource): SsoIdentity | null {
  const raw = headerValue(headers, SSO_UID_HEADER);
  if (!raw) {
    return null;
  }

  const externalId = raw.trim();
  if (!externalId || externalId.length > MAX_IDENTITY_LENGTH || externalId.includes(",")) {
    return null;
  }

  const username =
    headerValue(headers, SSO_USERNAME_HEADER)?.trim().slice(0, MAX_USERNAME_LENGTH) || "unknown";

  return { externalId, username };
}

/**
 * Resolves an SSO identity to a ConvertX user, creating the row on first sight.
 *
 * `users.external_id` holds the original proxy value (a 64-hex authentik uid, an email, an opaque
 * subject — whatever `SSO_UID_HEADER` carries) under a UNIQUE index. The numeric `users.id` stays
 * the surrogate key that `jobs.user_id` references, so no id range is reserved and no identity is
 * hashed away.
 *
 * `email` reuses the existing TEXT column for the display name. The password is a hash of a random
 * value, so no password login can ever match an SSO account.
 *
 * @returns The `users.id` of the identity.
 */
export async function ensureSsoUser({ externalId, username }: SsoIdentity): Promise<number> {
  const existing = db
    .query("SELECT id, email FROM users WHERE external_id = ?")
    .get(externalId) as { id: number; email: string } | null;
  if (existing) {
    // A renamed proxy user keeps the same row; refresh the display name.
    if (existing.email !== username) {
      db.query("UPDATE users SET email = ? WHERE id = ?").run(username, existing.id);
    }
    return existing.id;
  }

  const password = await Bun.password.hash(crypto.randomUUID());
  db.query("INSERT OR IGNORE INTO users (email, password, external_id) VALUES (?, ?, ?)").run(
    username,
    password,
    externalId,
  );

  // INSERT OR IGNORE also swallows a UNIQUE violation from another writer. Read
  // the row back and fail loudly if the value did not actually come to rest
  // here, instead of handing out an id that belongs to someone else.
  const row = db
    .query("SELECT id, external_id FROM users WHERE external_id = ?")
    .get(externalId) as { id: number; external_id: string | null } | null;
  if (!row || row.external_id !== externalId) {
    throw new Error("SSO identity did not resolve to a single users row");
  }

  return row.id;
}
