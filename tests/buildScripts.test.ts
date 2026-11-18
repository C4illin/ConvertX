import { describe, expect, test } from "bun:test";

import pkg from "../package.json";

const scripts = pkg.scripts as Record<string, string>;

describe("client bundles are generated (public/*.js is gitignored)", () => {
  test.each(["dev", "hot"])("%s builds the client scripts first", (name) => {
    expect(scripts[`pre${name}`]).toBe("bun run build:client");
  });

  test("build:client bundles every client script that a page loads", () => {
    for (const script of ["script.ts", "results.ts", "history.ts"]) {
      expect(scripts["build:client"]).toContain(`public/${script}`);
    }
  });
});
