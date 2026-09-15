import fs from "fs";
import { beforeEach, afterEach, expect, test, describe } from "bun:test";
import { buildDaselArgs, convert } from "../../src/converters/dasel";
import type { ExecFileFn } from "../../src/converters/types";

const originalWriteFile = fs.writeFile;

describe("convert", () => {
  let mockExecFile: ExecFileFn;

  beforeEach(() => {
    // mock fs.writeFile
    // @ts-expect-error: property __promisify__ is missing
    fs.writeFile = (path, data, cb) => cb(null);
    // mock execFile
    mockExecFile = (cmd, args, callback) => callback(null, "output-data", "");
  });

  afterEach(() => {
    // reset fs.writeFile
    fs.writeFile = originalWriteFile;
  });

  test("should build dasel v3 arguments", () => {
    expect(buildDaselArgs("input.yaml", "yaml", "json")).toEqual([
      "--var",
      "data=yaml:file:input.yaml",
      "--out",
      "json",
      "$data",
    ]);
  });

  test("should call dasel with correct arguments and write output", async () => {
    let calledArgs: Parameters<ExecFileFn> = ["", [], () => {}];
    mockExecFile = (cmd, args, callback) => {
      calledArgs = [cmd, args, callback];
      callback(null, "output-data", "");
    };

    let writeFileCalled = false;
    // @ts-expect-error: property __promisify__ is missing
    fs.writeFile = (path, data, cb) => {
      writeFileCalled = true;
      expect(path).toBe("output.json");
      expect(data).toBe("output-data");
      // @ts-expect-error: could not be callable with null
      cb(null);
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
    expect(writeFileCalled).toBe(true);
    expect(result).toBe("Done");
  });

  test("should close dasel stdin so v3 does not wait for input", async () => {
    let stdinEnded = false;
    mockExecFile = (cmd, args, callback) => {
      callback(null, "output-data", "");
      return { stdin: { end: () => (stdinEnded = true) } } as ReturnType<ExecFileFn>;
    };

    await convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile);

    expect(stdinEnded).toBe(true);
  });

  test("should reject if execFile returns an error", async () => {
    mockExecFile = (cmd, args, callback) => callback(new Error("fail"), "", "");
    await expect(
      convert("input.yaml", "yaml", "json", "output.json", undefined, mockExecFile),
    ).rejects.toMatch(/error: Error: fail/);
  });

  test("should reject if writeFile fails", async () => {
    // @ts-expect-error: property __promisify__ is missing
    fs.writeFile = (path, data, cb) => cb(new Error("write fail"));
    await expect(
      convert("input.yaml", "yaml", "json", "output.json", undefined, (cmd, args, cb) =>
        cb(null, "output-data", ""),
      ),
    ).rejects.toMatch(/Failed to write output/);
  });
});
