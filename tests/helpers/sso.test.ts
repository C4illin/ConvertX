import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { resolveSsoIdentity } from "../../src/helpers/sso";

const uid = () => randomBytes(32).toString("hex");

/** A real `Headers`, which is the only thing `request.headers` ever is at runtime. */
const headers = (init: Record<string, string> | [string, string][]) => new Headers(init);

describe("resolveSsoIdentity", () => {
  test("reads the identity from a Headers instance", () => {
    const id = uid();

    expect(
      resolveSsoIdentity(
        headers({
          "X-Authentik-Uid": id,
          "X-Authentik-Username": "alice",
        }),
      ),
    ).toEqual({ externalId: id, username: "alice" });
  });

  test("carries no name when the username header is absent", () => {
    const id = uid();

    // Not a placeholder: an existing user must not be renamed to "unknown" by a request
    // that only carries the id.
    expect(resolveSsoIdentity(headers({ "x-authentik-uid": id }))).toEqual({
      externalId: id,
      username: null,
    });
  });

  test("treats an empty username header as no name", () => {
    const id = uid();

    expect(
      resolveSsoIdentity(headers({ "x-authentik-uid": id, "x-authentik-username": "   " })),
    ).toEqual({ externalId: id, username: null });
  });

  test("trims the identity and caps the username", () => {
    const id = uid();

    expect(
      resolveSsoIdentity(
        headers({ "x-authentik-uid": ` ${id} `, "x-authentik-username": "  alice  " }),
      ),
    ).toEqual({ externalId: id, username: "alice" });

    const longName = "a".repeat(300);
    expect(
      resolveSsoIdentity(headers({ "x-authentik-uid": id, "x-authentik-username": longName })),
    ).toEqual({
      externalId: id,
      username: longName.slice(0, 255),
    });
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
    // A proxy that appends instead of replacing produces "uid, attacker". Hashing that
    // would mint a new identity and orphan the real user's jobs.
    ["a comma-joined duplicate header", `${uid()}, ${uid()}`],
  ];

  test.each(rejected)("rejects %s", (_: string, value: string) => {
    expect(resolveSsoIdentity(headers({ "x-authentik-uid": value }))).toBeNull();
  });

  test("rejects a header sent twice, which Headers folds into one comma-joined value", () => {
    // Repeated request-header lines are joined by `Headers` itself, so the same guard
    // covers a proxy that appends rather than replaces — no separate array branch needed.
    const repeated = headers([
      ["x-authentik-uid", uid()],
      ["x-authentik-uid", uid()],
    ]);

    expect(repeated.get("x-authentik-uid")).toContain(",");
    expect(resolveSsoIdentity(repeated)).toBeNull();
  });
});
