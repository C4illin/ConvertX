import { test, expect } from "bun:test";
import { convert } from "../../src/converters/inkscape";
import type { ExecFileException } from "node:child_process";
import { ExecFileFn } from "../../src/converters/types";

// Inkscape 使用 xvfb-run 包裝，需要自訂測試
// 模擬 xvfb-run 成功執行的情況

test("convert resolves when xvfb-run succeeds", async () => {
  const mockExecFile: ExecFileFn = (
    cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    // xvfb-run 成功
    if (cmd === "xvfb-run") {
      callback(null, "Conversion complete", "");
    }
  };

  const result = await convert("input.svg", "svg", "png", "output.png", undefined, mockExecFile);
  expect(result).toBe("Done");
});

test("convert falls back to direct inkscape when xvfb-run fails", async () => {
  let callCount = 0;

  const mockExecFile: ExecFileFn = (
    cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    callCount++;
    if (cmd === "xvfb-run") {
      // xvfb-run 失敗
      callback(new Error("xvfb-run not found"), "", "");
    } else if (cmd === "inkscape") {
      // 直接呼叫 inkscape 成功
      callback(null, "Direct inkscape success", "");
    }
  };

  const result = await convert("input.svg", "svg", "png", "output.png", undefined, mockExecFile);
  expect(result).toBe("Done");
  expect(callCount).toBe(2); // 應該呼叫兩次（xvfb-run + inkscape）
});

test("convert rejects when both xvfb-run and inkscape fail", async () => {
  const mockExecFile: ExecFileFn = (
    cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    if (cmd === "xvfb-run") {
      callback(new Error("xvfb-run failed"), "", "");
    } else if (cmd === "inkscape") {
      callback(new Error("inkscape failed"), "", "");
    }
  };

  await expect(
    convert("input.svg", "svg", "png", "output.png", undefined, mockExecFile),
  ).rejects.toMatch(/error:/);
});

test("convert logs stdout when present", async () => {
  const originalConsoleLog = console.log;
  let loggedMessage = "";
  console.log = (msg: string) => {
    if (msg.startsWith("stdout:")) {
      loggedMessage = msg;
    }
  };

  const mockExecFile: ExecFileFn = (
    cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    if (cmd === "xvfb-run") {
      callback(null, "Fake stdout", "");
    }
  };

  await convert("input.svg", "svg", "png", "output.png", undefined, mockExecFile);
  console.log = originalConsoleLog;

  expect(loggedMessage).toBe("stdout: Fake stdout");
});

test("convert logs stderr when present (non-fatal warning)", async () => {
  const originalConsoleLog = console.log;
  let loggedMessage = "";
  console.log = (msg: string) => {
    if (msg.startsWith("stderr:")) {
      loggedMessage = msg;
    }
  };

  const mockExecFile: ExecFileFn = (
    cmd: string,
    _args: string[],
    callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
  ) => {
    if (cmd === "xvfb-run") {
      // Inkscape 經常輸出警告到 stderr，但轉換仍成功
      callback(null, "", "Gtk-WARNING: some warning");
    }
  };

  await convert("input.svg", "svg", "png", "output.png", undefined, mockExecFile);
  console.log = originalConsoleLog;

  expect(loggedMessage).toBe("stderr: Gtk-WARNING: some warning");
});

test.skip("dummy - required to trigger test detection", () => {});
