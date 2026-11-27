import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { convert } from "../../../src/converters/imagemagick";

const outputsDirectory = path.resolve("tests/integration/converters/outputs/imagemagick-html");

test.each([
  { name: "multi-page", pages: 2 },
  { name: "single-page", pages: 1 },
])(
  "writes $name pdf to html with its map files and pngs next to the html",
  async ({ name, pages }) => {
    const directory = path.join(outputsDirectory, name);
    await rm(directory, { recursive: true, force: true });
    await mkdir(path.join(directory, "output"), { recursive: true });
    const inputPath = path.join(directory, "doc.pdf");
    execFileSync("magick", [
      "-size",
      "20x20",
      ...Array.from({ length: pages }, () => "xc:white"),
      inputPath,
    ]);
    const cwdBefore = (await readdir(process.cwd())).sort();

    // relative paths, as handleConvert passes them
    await convert(
      path.relative(process.cwd(), inputPath),
      "pdf",
      "html",
      path.relative(process.cwd(), path.join(directory, "output", "doc.html")),
    );

    const outputDirectory = path.join(directory, "output");
    const outputs = await readdir(outputDirectory);
    const htmlFiles = outputs.filter((file) => file.endsWith(".html"));
    expect(htmlFiles).toHaveLength(pages);
    if (pages > 1) {
      expect(outputs.filter((file) => file.endsWith("_map.shtml"))).toHaveLength(pages);
    }
    for (const htmlFile of htmlFiles.sort()) {
      const html = await readFile(path.join(outputDirectory, htmlFile), "utf8");
      const sources = [...html.matchAll(/src="([^"]+)"/g)].map((match) => match[1] ?? "");
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        // links must point next to the html so the downloaded pages work
        expect(path.dirname(source)).toBe(".");
      }
    }
    // ImageMagick itself names later pages' pngs doc-1-1.png etc., so only the first page's
    // link is checked to resolve
    const firstHtml = await readFile(path.join(outputDirectory, htmlFiles.sort()[0] ?? ""), "utf8");
    const firstSource = /src="([^"]+)"/.exec(firstHtml)?.[1] ?? "";
    expect(await Bun.file(path.join(outputDirectory, firstSource)).exists()).toBe(true);
    // nothing may be written to the process working directory
    expect((await readdir(process.cwd())).sort()).toEqual(cwdBefore);
  },
  60000,
);
