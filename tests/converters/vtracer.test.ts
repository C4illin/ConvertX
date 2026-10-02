import { afterEach, beforeEach, expect, test, describe } from "bun:test";
import { convert } from "../../src/converters/vtracer";
import { captureConsole, createMockExecFile } from "./helpers/converters";

describe("convert", () => {
  let output: ReturnType<typeof captureConsole>;

  beforeEach(() => {
    output = captureConsole();
  });

  afterEach(() => {
    output.restore();
  });

  test("should call vtracer with correct arguments (minimal)", async () => {
    const { execFile, calls } = createMockExecFile();

    const result = await convert("input.png", "png", "svg", "output.svg", undefined, execFile);

    expect(calls).toEqual([
      { cmd: "vtracer", args: ["--input", "input.png", "--output", "output.svg"] },
    ]);
    expect(result).toBe("Done");
  });

  test("should pass every supported option as a flag in a fixed order", async () => {
    const { execFile, calls } = createMockExecFile();

    // deliberately not in the converter's internal order
    const options = {
      path_precision: 8,
      splice_threshold: 45,
      max_iterations: 10,
      length_threshold: 4,
      corner_threshold: 60,
      layer_difference: 16,
      color_precision: 6,
      filter_speckle: 4,
      mode: "spline",
      hierarchical: "stacked",
      colormode: "color",
    };

    await convert("input.png", "png", "svg", "output.svg", options, execFile);

    expect(calls[0]?.args).toEqual([
      "--input",
      "input.png",
      "--output",
      "output.svg",
      "--colormode",
      "color",
      "--hierarchical",
      "stacked",
      "--mode",
      "spline",
      "--filter_speckle",
      "4",
      "--color_precision",
      "6",
      "--layer_difference",
      "16",
      "--corner_threshold",
      "60",
      "--length_threshold",
      "4",
      "--max_iterations",
      "10",
      "--splice_threshold",
      "45",
      "--path_precision",
      "8",
    ]);
  });

  test("should keep falsy option values such as 0", async () => {
    const { execFile, calls } = createMockExecFile();

    await convert("input.png", "png", "svg", "output.svg", { filter_speckle: 0 }, execFile);

    expect(calls[0]?.args.slice(4)).toEqual(["--filter_speckle", "0"]);
  });

  test("should ignore unknown and undefined options", async () => {
    const { execFile, calls } = createMockExecFile();

    const options = { mode: undefined, preset: "photo", "--output": "/etc/passwd" };
    await convert("input.png", "png", "svg", "output.svg", options, execFile);

    expect(calls[0]?.args).toEqual(["--input", "input.png", "--output", "output.svg"]);
  });

  test.each([null, "colormode=color", 42])(
    "should ignore non-object options (%p)",
    async (options) => {
      const { execFile, calls } = createMockExecFile();

      await convert("input.png", "png", "svg", "output.svg", options, execFile);

      expect(calls[0]?.args).toEqual(["--input", "input.png", "--output", "output.svg"]);
    },
  );

  test("should reject if execFile returns an error", async () => {
    const { execFile } = createMockExecFile({
      error: new Error("fail"),
      stderr: "stderr output",
    });

    await expect(
      convert("input.png", "png", "svg", "output.svg", undefined, execFile),
    ).rejects.toBe("error: Error: fail\nstderr: stderr output");
  });

  test("should omit the stderr suffix from the rejection when stderr is empty", async () => {
    const { execFile } = createMockExecFile({ error: new Error("fail") });

    await expect(
      convert("input.png", "png", "svg", "output.svg", undefined, execFile),
    ).rejects.toBe("error: Error: fail");
  });

  test("should log stdout and stderr of a successful run", async () => {
    const { execFile } = createMockExecFile({ stdout: "traced", stderr: "warning" });

    await convert("input.png", "png", "svg", "output.svg", undefined, execFile);

    // vtracer reports progress on stderr, so it is logged as regular output
    expect(output.logs).toEqual(["stdout: traced", "stderr: warning"]);
    expect(output.errors).toEqual([]);
  });
});
