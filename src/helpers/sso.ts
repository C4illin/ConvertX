import { createHash } from "node:crypto";

import db from "../db/db";
import { SSO_UID_HEADER, SSO_USERNAME_HEADER } from "./env";

/**
 * Lowest id an SSO user can get. Ids below this are reserved for local
 * accounts (see src/pages/root.tsx), so an SSO id can never shadow one.
 */
const FIRST_SSO_ID = 2 ** 24;

/** Width of the id range: ids stay in [2**24, 2**52), i.e. below 2**53-1. */
const SSO_ID_RANGE = 2 ** 52 - FIRST_SSO_ID;

/** authentik uids are 64 hex characters (sha256 of the user id + install id). */
const AUTHENTIK_UID = /^[0-9a-f]{64}$/i;

/** Anything longer is not an identity, it is abuse. */
const MAX_IDENTITY_LENGTH = 512;

export type SsoIdentity = { id: number; username: string };

/**
 * Maps a forward-auth uid to the integer primary key of a ConvertX user.
 *
 * authentik's `X-authentik-uid` is a 64 character sha256 digest, salted with
 * the authentik install id, so it is stable across restarts and restores. The
 * first 13 hex characters (52 bits) are used as-is: 52 bits always fit in a
 * double, so the id survives the JSON round trip through the JWT cookie, and
 * the offset keeps it out of the local-account range.
 *
 * Older ConvertX deployments (and other forward-auth proxies) send something
 * that is not an authentik uid, e.g. a username or an email. Those cannot be
 * represented as an integer directly, so they are hashed with sha256. The
 * mapping stays deterministic, but the original value is not recoverable from
 * the id -- only from the `users.email` column.
 *
 * @returns the id, or null when the value is not usable as an identity.
 */
export function ssoIdForUid(uid: string): number | null {
  const value = uid.trim();
  if (!value || value.length > MAX_IDENTITY_LENGTH) {
    return null;
  }

  if (AUTHENTIK_UID.test(value)) {
    return FIRST_SSO_ID + (Number.parseInt(value.slice(0, 13), 16) % SSO_ID_RANGE);
  }

  const digest = createHash("sha256").update(value, "utf8").digest();
  return FIRST_SSO_ID + (digest.readUIntBE(0, 6) % SSO_ID_RANGE);
}

export type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined
  | null;

/**
 * Reads one header from either a WHATWG `Headers` instance (what `request.headers`
 * is at runtime) or a plain object (what the tests pass). Both shapes reach this
 * function in practice; a compiled build can hand a route no parsed `headers` at
 * all, so call sites pass `request.headers` and this function accepts either.
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
 * The header name is configurable because the proxy decides it; the values to
 * trust are documented per deployment (Traefik strips client-supplied values
 * for every header listed in the forward-auth middleware, and a NetworkPolicy
 * keeps clients off the app port). Nothing here is a substitute for that.
 */
export function resolveSsoIdentity(headers: HeaderSource): SsoIdentity | null {
  const uid = headerValue(headers, SSO_UID_HEADER);
  if (!uid) {
    return null;
  }

  const id = ssoIdForUid(uid);
  if (id === null) {
    return null;
  }

  const username = headerValue(headers, SSO_USERNAME_HEADER)?.trim() || "unknown";
  return { id, username };
}

/**
 * Creates the `users` row for an SSO identity the first time it is seen.
 *
 * `jobs.user_id` is a foreign key to `users.id`, so the row has to exist before
 * the first job is written. `email` reuses the existing TEXT column to store
 * the username (no schema change); `password` is a hash of a random value, so
 * no password login can ever match an SSO account.
 */
export async function ensureSsoUser({ id, username }: SsoIdentity): Promise<void> {
  const existing = db.query("SELECT id FROM users WHERE id = ?").get(id);
  if (existing) {
    return;
  }

  const password = await Bun.password.hash(crypto.randomUUID());
  db.query("INSERT OR IGNORE INTO users (id, email, password) VALUES (?, ?, ?)").run(
    id,
    username,
    password,
  );
}
