import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { ssoIdForUid } from "../../src/helpers/sso";

const FIRST_SSO_ID = 2 ** 24;
const END_SSO_ID = 2 ** 52;

const authentikUid = () => randomBytes(32).toString("hex");

describe("ssoIdForUid", () => {
  test("maps a 64 character authentik uid to an integer in the SSO range", () => {
    const id = ssoIdForUid(authentikUid());

    expect(id).not.toBeNull();
    expect(id!).toBeGreaterThanOrEqual(FIRST_SSO_ID);
    expect(id!).toBeLessThan(END_SSO_ID);
    // users.id is an INTEGER that travels through JSON in the JWT cookie
    expect(JSON.parse(JSON.stringify(id))).toBe(id);
    expect(Number.isSafeInteger(id)).toBe(true);
  });

  test("is deterministic", () => {
    const uid = authentikUid();

    expect(ssoIdForUid(uid)).toBe(ssoIdForUid(uid));
    expect(ssoIdForUid(uid.toUpperCase())).toBe(ssoIdForUid(uid));
    expect(ssoIdForUid(` ${uid} `)).toBe(ssoIdForUid(uid));
  });

  test("gives different uids different ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => ssoIdForUid(authentikUid())));

    expect(ids.size).toBe(200);
  });

  test("hashes a value that is not an authentik uid, deterministically", () => {
    const first = ssoIdForUid("meliver@example.com");
    const second = ssoIdForUid("meliver@example.com");

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(first!).toBeGreaterThanOrEqual(FIRST_SSO_ID);
    expect(first!).toBeLessThan(END_SSO_ID);
    expect(ssoIdForUid("MELIVER@example.com")).not.toBe(first);
  });

  test("never returns an id reserved for local accounts", () => {
    // 0x0000000000000 would truncate to 0 without the offset
    const id = ssoIdForUid("0".repeat(64));

    expect(id).toBe(FIRST_SSO_ID);
  });

  const rejected: [string, string][] = [
    ["an empty value", ""],
    ["whitespace", "   "],
    ["an oversized header value", "a".repeat(513)],
  ];

  test.each(rejected)("rejects %s", (_, value) => {
    expect(ssoIdForUid(value)).toBeNull();
  });
});
