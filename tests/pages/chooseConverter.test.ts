import { describe, expect, test } from "bun:test";

import { request } from "./helpers/app";

async function conversionsFor(fileType: string) {
  return (await request("/conversions", { json: { fileType } })).text();
}

describe("POST /conversions", () => {
  test("lists the targets of every converter that accepts the file type", async () => {
    const body = await conversionsFor("vcf");

    expect(body).toContain('data-converter="vcf"');
    expect(body).toContain('data-value="csv,vcf"');
    expect(body).toContain('<optgroup label="vcf"><option value="csv,vcf">csv</option></optgroup>');
  });

  test("normalizes the file type", async () => {
    expect(await conversionsFor("VCF")).toBe(await conversionsFor("vcf"));
    expect(await conversionsFor("jpg")).toBe(await conversionsFor("jpeg"));
  });

  test("resolves compound extensions from the file name", async () => {
    // the client only knows the last segment ("gz"), the file name carries "nii.gz"
    const response = await request("/conversions", {
      json: { fileType: "gz", fileName: "scan.nii.gz" },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(await conversionsFor("nii.gz"));
    expect(await conversionsFor("nii.gz")).toContain('data-converter="vips"');
  });

  test("advertises the 3cx.wav telephony preset under ffmpeg", async () => {
    const body = await conversionsFor("wav");

    expect(body).toContain('data-value="3cx.wav,ffmpeg"');
  });

  test("maps the legacy wav-3cx label to 3cx.wav", async () => {
    expect(await conversionsFor("wav-3cx")).toBe(await conversionsFor("3cx.wav"));
  });

  test("offers no converters for an unknown file type", async () => {
    const body = await conversionsFor("xyz123");

    expect(body).not.toContain("convert_to_group");
    expect(body).not.toContain("<optgroup");
    // the placeholder of the select is still rendered
    expect(body).toContain('<option selected disabled value="">');
  });

  test("returns a fragment, not a full page", async () => {
    const body = await conversionsFor("vcf");

    expect(body).toStartWith("<article");
    expect(body).not.toContain("<html");
  });

  test("works without a session, as it only exposes the converter list", async () => {
    const response = await request("/conversions", { json: { fileType: "vcf" } });

    expect(response.status).toBe(200);
  });

  test("rejects a request without a file type", async () => {
    const response = await request("/conversions", { json: {} });

    expect(response.status).toBe(422);
  });
});
