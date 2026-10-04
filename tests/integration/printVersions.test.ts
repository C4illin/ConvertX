import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";

let consoleLogSpy: ReturnType<typeof spyOn>;
let consoleErrorSpy: ReturnType<typeof spyOn>;
let originalNodeEnv: string | undefined;

beforeEach(() => {
  originalNodeEnv = process.env.NODE_ENV;
});

afterEach(() => {
  if (consoleLogSpy) consoleLogSpy.mockRestore();
  if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  process.env.NODE_ENV = originalNodeEnv;
});

test("prints system information and tool versions in production mode without errors", async () => {
  process.env.NODE_ENV = "production";
  consoleLogSpy = spyOn(console, "log");
  consoleErrorSpy = spyOn(console, "error");

  await import("../../src/helpers/printVersions?test=" + Math.random());

  // Wait for all exec callbacks to finish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(consoleErrorSpy).not.toHaveBeenCalled();

  // We expect at least the tools in printVersions.ts to be logged
  expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(15);

  // Verify the standard format "ToolName v1.2.3" for all tools (except ConvertX version and OS)
  // ConvertX vX.X.X is the first call, OS is the second call.
  // Actually, because callbacks are async, we should just check if it matches the pattern or is OS string
  for (const call of consoleLogSpy.mock.calls) {
    const msg = call[0];

    // Ignore the OS string which doesn't follow the pattern
    if (msg.includes("Linux") || msg.includes("Debian") || msg.includes("Ubuntu")) continue;

    // Dasel on Debian Sid prints "development" instead of a numerical version
    if (msg === "dasel development") continue;

    // The pattern is "Name vVersion" where Version must start with a digit
    // e.g., "FFmpeg v8.1.2-2+b3", "potrace v1.16"
    expect(msg).toMatch(/^[a-zA-Z0-9_-]+\s+v\d+[a-zA-Z0-9+.-]*$/);
    expect(msg).not.toMatch(/unknown/i);
  }
}, 10000);
