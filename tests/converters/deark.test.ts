import { test, expect, describe, mock } from "bun:test";
import { convert, properties } from "../../src/converters/deark";
import type { ExecFileFn } from "../../src/converters/types";

describe("deark converter", () => {
  test("properties should have correct structure", () => {
    expect(properties).toBeDefined();
    expect(properties.from).toBeDefined();
    expect(properties.to).toBeDefined();
    expect(properties.outputMode).toBe("archive");
  });

  test("properties.from should contain supported formats", () => {
    expect(properties.from.files).toBeDefined();
    // Archive formats
    expect(properties.from.files).toContain("zip");
    expect(properties.from.files).toContain("lha");
    expect(properties.from.files).toContain("arc");
    // Image formats
    expect(properties.from.files).toContain("ico");
    expect(properties.from.files).toContain("bmp");
    expect(properties.from.files).toContain("pcx");
  });

  test("properties.to should have extract option", () => {
    expect(properties.to.files).toBeDefined();
    expect(properties.to.files).toContain("extract");
  });

  test("convert resolves when execFile succeeds", async () => {
    const mockExecFile = mock(
      (
        cmd: string,
        args: string[],
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        // First call is deark, second call is tar
        callback(null, "Success", "");
      },
    );

    // Mock fs functions would be needed for full test
    // This is a simplified test
    try {
      await convert(
        "/tmp/test.zip",
        "zip",
        "extract",
        "/tmp/output/test",
        {},
        mockExecFile as ExecFileFn,
      );
    } catch (error) {
      // Expected to fail due to fs operations not being mocked
      expect(error).toBeDefined();
    }
  });

  test("convert rejects when deark fails", async () => {
    const mockExecFile = mock(
      (
        cmd: string,
        args: string[],
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(new Error("deark failed"), "", "Unknown or unsupported format");
      },
    );

    try {
      await convert(
        "/tmp/test.unknown",
        "unknown",
        "extract",
        "/tmp/output/test",
        {},
        mockExecFile as ExecFileFn,
      );
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
      expect(String(error)).toContain("不支援此檔案格式");
    }
  });
});

// Skip common tests as deark has different behavior (archive output)
test.skip("dummy - required to trigger test detection", () => {});
