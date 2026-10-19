import fs from "fs";
import { beforeEach, afterEach, expect, test, describe } from "bun:test";
import { buildDaselArgs, convert } from "../../src/converters/dasel";
import type { ExecFileFn } from "../../src/converters/types";
import { captureConsole } from "./helpers/converters";

const originalWriteFile = fs.writeFile;

describe("buildDaselArgs", () => {
  test("should build dasel v3 arguments", () => {
    expect(buildDaselArgs("input.yaml", "yaml", "json")).toEqual([
      "--var",
      "data=yaml:file:input.yaml",
      "--out",
      "json",
      "$data",
    ]);
  });

  test.each([
    ["toml", "yaml"],
    ["json", "toml"],
    ["xml", "json"],
    ["csv", "yaml"],
  ])("should read %s and write %s", (fileType, convertTo) => {
    expect(buildDaselArgs(`in/data.${fileType}`, fileType, convertTo)).toEqual([
      "--var",
      `data=${fileType}:file:in/data.${fileType}`,
      "--out",
      convertTo,
      "$data",
    ]);
  });
});

describe("convert", () => {
  let mockExecFile: ExecFileFn;
  let writes: { path: unknown; data: unknown }[];
  let output: ReturnType<typeof captureConsole>;

  beforeEach(() => {
    writes = [];
    output = captureConsole();
    // mock fs.writeFile
    // @ts-expect-error: property __promisify__ is missing
    fs.writeFile = (path, data, cb) => {
      writes.push({ path, data });
      // @ts-expect-error: could not be callable with null
      cb(null);
    };
    // mock execFile
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "");
  });

  afterEach(() => {
    // reset fs.writeFile
    fs.writeFile = originalWriteFile;
    output.restore();
  });

  test("should call dasel with correct arguments and write output", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };

    const result = await convert(
      "input.yaml",
      "yaml",
      "json",
      "output.json",
      undefined,
      mockExecFile,
    );

    expect(calledArgs[0]).toBe("dasel");
    expect(calledArgs[1]).toEqual(["--var", "data=yaml:file:input.yaml", "--out", "json", "$data"]);
    expect(writes).toEqual([{ path: "output.json", data: "output-data" }]);
    expect(result).toBe("Done");
  });

  test("should close dasel stdin so v3 does not wait for input", async () => {
    let stdinEnded = false;
    mockExecFile = (cmd, args, callback) => {
      callback(null, "output-data", "");
      return { stdin: { end: () => (stdinEnded = true) } } as unknown as ReturnType<ExecFileFn>;
    };

    await convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile);

    expect(stdinEnded).toBe(true);
  });

  test("should not fail when execFile returns no child process", async () => {
    mockExecFile = (cmd, args, callback) => {
      callback(null, "output-data", "");
      return undefined;
    };

    await expect(
      convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile),
    ).resolves.toBe("Done");
  });

  test("should log stderr and still write the output", async () => {
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "deprecation warning");

    await convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile);

    expect(output.errors).toEqual(["stderr: deprecation warning"]);
    expect(writes).toHaveLength(1);
  });

  test("should not log stdout, since it is the converted document", async () => {
    await convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile);

    expect(output.logs).toEqual([]);
  });

  test("should reject and not write anything if execFile returns an error", async () => {
    mockExecFile = (cmd, args, callback) => callback(new Error("fail"), "", "");
    await expect(
      convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile),
    ).rejects.toMatch(/error: Error: fail/);
    expect(writes).toEqual([]);
  });

  test("should reject if writeFile fails", async () => {
    // @ts-expect-error: property __promisify__ is missing
    fs.writeFile = (path, data, cb) => cb(new Error("write fail"));
    await expect(
      convert("input.yaml", "yaml", "json", "output.json", undefined, (cmd, args, cb) =>
        cb(null, "output-data", ""),
      ),
    ).rejects.toMatch(/Failed to write output: Error: write fail/);
  });
});
