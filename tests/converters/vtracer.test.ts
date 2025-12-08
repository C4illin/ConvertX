import { beforeEach, expect, test, describe } from "bun:test";
import { convert } from "../../src/converters/vtracer";
import type { ExecFileFn } from "../../src/converters/types";

describe("convert", () => {
  let mockExecFile: ExecFileFn;

  beforeEach(() => {
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "");
  });

  test("should call vtracer with correct arguments (minimal)", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };

    const result = await convert("input.png", "png", "svg", "output.svg", undefined, mockExecFile);

    expect(calledArgs[0]).toBe("vtracer");
    expect(calledArgs[1]).toEqual(["--input", "input.png", "--output", "output.svg"]);
    expect(result).toBe("Done");
  });

  test("should add options as arguments", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };

    const options = {
      colormode: "color",
      hierarchical: "true",
      filter_speckle: 5,
      path_precision: 0.8,
    };

    await convert("input.png", "png", "svg", "output.svg", options, mockExecFile);

    expect(calledArgs[1]).toContain("--colormode");
    expect(calledArgs[1]).toContain("color");
    expect(calledArgs[1]).toContain("--hierarchical");
    expect(calledArgs[1]).toContain("true");
    expect(calledArgs[1]).toContain("--filter_speckle");
    expect(calledArgs[1]).toContain("5");
    expect(calledArgs[1]).toContain("--path_precision");
    expect(calledArgs[1]).toContain("0.8");
  });

  test("should reject if execFile returns an error", async () => {
    mockExecFile = (cmd, args, callback) => callback(new Error("fail"), "", "stderr output");
    expect(
      convert("input.png", "png", "svg", "output.svg", undefined, mockExecFile),
    ).rejects.toMatch(/error: Error: fail\nstderr: stderr output/);
  });
});
