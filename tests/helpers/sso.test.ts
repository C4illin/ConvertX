import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { resolveSsoIdentity } from "../../src/helpers/sso";

const uid = () => randomBytes(32).toString("hex");

describe("resolveSsoIdentity", () => {
  test("reads a WHATWG Headers instance, which is what request.headers is", () => {
    const id = uid();
    const headers = new Headers({
      "X-Authentik-Uid": id,
      "X-Authentik-Username": "alice",
    });

    expect(resolveSsoIdentity(headers)).toEqual({ externalId: id, username: "alice" });
  });

  test("reads a plain lower-case object", () => {
    const id = uid();

    expect(resolveSsoIdentity({ "x-authentik-uid": id })).toEqual({
      externalId: id,
      username: "unknown",
    });
  });

  test("reads a plain object whose keys keep their original case", () => {
    const id = uid();

    expect(resolveSsoIdentity({ "X-Authentik-Uid": id, "X-Authentik-Username": "bob" })).toEqual({
      externalId: id,
      username: "bob",
    });
  });

  test("trims the identity and caps the username", () => {
    const id = uid();

    expect(
      resolveSsoIdentity({ "x-authentik-uid": ` ${id} `, "x-authentik-username": "  alice  " }),
    ).toEqual({ externalId: id, username: "alice" });

    const longName = "a".repeat(300);
    expect(resolveSsoIdentity({ "x-authentik-uid": id, "x-authentik-username": longName })).toEqual(
      {
        externalId: id,
        username: longName.slice(0, 255),
      },
    );
  });

  test("returns null instead of throwing when there are no headers at all", () => {
    expect(resolveSsoIdentity(undefined)).toBeNull();
    expect(resolveSsoIdentity(null)).toBeNull();
    expect(resolveSsoIdentity(new Headers())).toBeNull();
  });

  const rejected: [string, string][] = [
    ["an empty value", ""],
    ["whitespace", "   "],
    ["an oversized header value", "a".repeat(513)],
    // A proxy that appends instead of replacing produces "uid, attacker".
    // Hashing that would mint a new identity and orphan the real user's jobs.
    ["a comma-joined duplicate header", `${uid()}, ${uid()}`],
  ];

  test.each(rejected)("rejects %s", (_: string, value: string) => {
    expect(resolveSsoIdentity({ "x-authentik-uid": value })).toBeNull();
  });
});
