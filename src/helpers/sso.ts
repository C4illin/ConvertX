import db from "../db/db";
import { SSO_UID_HEADER, SSO_USERNAME_HEADER } from "./env";

/** Anything longer is not an identity, it is abuse. */
const MAX_IDENTITY_LENGTH = 512;

/** Users.email is a TEXT column; a sane display name fits comfortably. */
const MAX_USERNAME_LENGTH = 255;

export type SsoIdentity = { externalId: string; username: string | null };

/**
 * Reads one header from the request's `Headers`. `undefined` is tolerated because a compiled build
 * once handed a route no parsed `headers` object at all, and a 401 is a better failure than a 500.
 * Repeated header lines are already joined with ", " by `Headers.get`, which is what the comma
 * guard in `resolveSsoIdentity` then rejects.
 */
function headerValue(headers: Headers | undefined | null, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  return headers.get(name.toLowerCase()) ?? undefined;
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
export function resolveSsoIdentity(headers: Headers | undefined | null): SsoIdentity | null {
  const raw = headerValue(headers, SSO_UID_HEADER);
  if (!raw) {
    return null;
  }

  const externalId = raw.trim();
  if (!externalId || externalId.length > MAX_IDENTITY_LENGTH || externalId.includes(",")) {
    return null;
  }

  // Null, not a placeholder: a request that carries the id but not the name must not
  // rename the user, or the display name flips to "unknown" and back on the next one.
  const name = headerValue(headers, SSO_USERNAME_HEADER)?.trim().slice(0, MAX_USERNAME_LENGTH);

  return { externalId, username: name ? name : null };
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
    // A renamed proxy user keeps the same row; refresh the display name. A request
    // without the username header leaves the stored name alone instead of flattening
    // it to a placeholder and back again on the next request.
    if (username !== null && existing.email !== username) {
      db.query("UPDATE users SET email = ? WHERE id = ?").run(username, existing.id);
    }
    return existing.id;
  }

  const password = await Bun.password.hash(crypto.randomUUID());
  // First sight is the only place the placeholder is allowed: `users.email` is NOT NULL,
  // and a name that is merely late should not stop the row existing.
  db.query("INSERT OR IGNORE INTO users (email, password, external_id) VALUES (?, ?, ?)").run(
    username ?? "unknown",
    password,
    externalId,
  );

  // INSERT OR IGNORE also swallows a UNIQUE violation from another writer (and, with the
  // index missing, would not even do that). A row is the only acceptable outcome: if the
  // identity did not come to rest anywhere, failing here is better than handing out an id.
  const row = db.query("SELECT id FROM users WHERE external_id = ?").get(externalId) as {
    id: number;
  } | null;
  if (!row) {
    throw new Error("SSO identity did not resolve to a users row");
  }

  return row.id;
}
