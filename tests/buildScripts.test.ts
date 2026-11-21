import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

import pkg from "../package.json";

const scripts = pkg.scripts as Record<string, string>;

const pagesDir = new URL("../src/pages/", import.meta.url);
const pageScripts = readdirSync(pagesDir)
  .filter((file) => file.endsWith(".tsx"))
  .flatMap((file) =>
    Array.from(
      readFileSync(new URL(file, pagesDir), "utf8").matchAll(
        /<script src=\{?[`"][^`"]*?(\w+)\.js[`"]/g,
      ),
      (match) => match[1]!,
    ),
  )
  .sort();

describe("client bundles are generated (public/*.js is gitignored)", () => {
  test("finds the scripts that pages load", () => {
    expect(pageScripts).toEqual(["history", "results", "script"]);
  });

  test("build:client bundles every client script that a page loads", () => {
    for (const script of pageScripts) {
      expect(scripts["build:client"]).toContain(`public/${script}.ts`);
    }
  });

  test.each(["dev", "hot"])("%s builds the client scripts first", (name) => {
    expect(scripts[`pre${name}`]).toBe("bun run build:client");
  });

  test.each(["dev", "hot"])("%s rebuilds the client scripts when they change", (name) => {
    expect(scripts[name]).toContain("build:client --watch");
    expect(scripts[`${name}:server`]).toContain("src/index.tsx");
  });
});
