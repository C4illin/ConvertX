import { expect, test, describe } from "bun:test";
import { isSafePath } from "../src/helpers/validatePath";

describe("isSafePath", () => {
  test("should allow no slash", () => {
    const path = "cat.jpg";
    const result = isSafePath("./job/", `./job/${path}`);
    expect(result).toEqual(true);
  });

  test("should allow safe slash", () => {
    const path = "dir/cat.jpg";
    const result = isSafePath("./job/", `./job/${path}`);
    expect(result).toEqual(true);
  });

  test("should allow leading slash", () => {
    const path = "/dir/cat.jpg";
    const result = isSafePath("./job/", `./job/${path}`);
    expect(result).toEqual(true);
  });

  test("should allow leading dots", () => {
    const path = "dir/..cat.jpg";
    const result = isSafePath("./job/", `./job/${path}`);
    expect(result).toEqual(true);
  });

  test("should disallow parent", () => {
    const path = "../cat.jpg";
    const result = isSafePath("./job/", `./job/${path}`);
    expect(result).toEqual(false);
  });
});
