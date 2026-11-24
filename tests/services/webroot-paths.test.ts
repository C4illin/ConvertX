import { describe, expect, test } from "bun:test";

import { isLocalOnlyPath, normaliseWebroot } from "../../src/services/user";

describe("normaliseWebroot", () => {
  test.each([
    ["", ""],
    ["/", ""],
    ["convertx", "/convertx"],
    ["/convertx", "/convertx"],
    ["/convertx/", "/convertx"],
  ])("%p -> %p", (webroot: string, want: string) => {
    expect(normaliseWebroot(webroot)).toBe(want);
  });
});

describe("isLocalOnlyPath", () => {
  // The SSO guard decides whether the local login, setup and registration routes exist. A root
  // that does not match the shape the router mounts silently leaves them reachable, so every
  // spelling the router accepts is pinned here.
  test.each([
    ["", "/login", true],
    ["", "/setup", true],
    ["", "/register", true],
    ["", "/account", false],
    ["/", "/login", true],
    ["/convertx", "/convertx/login", true],
    ["/convertx", "/convertx/setup", true],
    ["/convertx/", "/convertx/login", true],
    ["convertx", "/convertx/login", true],
    ["convertx", "/convertx/setup", true],
    ["convertx", "/convertx/register", true],
    ["/convertx", "/convertxX/login", false],
    ["/convertx", "/login", false],
    ["/convertx", "/convertx/account", false],
    ["", "/LOGIN", false],
  ])("isLocalOnlyPath(%p, %p) = %p", (root: string, path: string, want: boolean) => {
    expect(isLocalOnlyPath(path, normaliseWebroot(root))).toBe(want);
  });
});
