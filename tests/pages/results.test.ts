import { expect, test } from "bun:test";
import { buildDownloadUrl } from "../../src/helpers/buildDownloadUrl";

test("encodes reserved characters in download filenames", () => {
  expect(buildDownloadUrl("", "1/2/", "clip #1?.gif")).toBe("/download/1/2/clip%20%231%3F.gif");
});

test("preserves output path segments while encoding the filename", () => {
  expect(buildDownloadUrl("/convertx", "user/job/", "報告 100%.pdf")).toBe(
    "/convertx/download/user/job/%E5%A0%B1%E5%91%8A%20100%25.pdf",
  );
});
