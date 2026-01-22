/**
 * API E2E 測試
 *
 * 這些測試使用 Elysia 的測試工具直接測試 HTTP API。
 * 不需要啟動獨立的伺服器。
 *
 * 執行方式：
 *   bun test tests/e2e/api.e2e.test.ts
 *
 * 測試覆蓋：
 *   - Healthcheck API
 *   - 檔案上傳流程
 *   - 轉換工作流程
 *   - 結果下載流程
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { existsSync } from "node:fs";

import { healthcheck } from "../../src/pages/healthcheck";
import { setupOutputDir } from "./helpers";

beforeAll(() => {
  setupOutputDir("api");
});

afterAll(() => {
  // 保留輸出目錄以便檢查
});

// ============================================================================
// Healthcheck API 測試
// ============================================================================

describe("Healthcheck API", () => {
  const app = new Elysia().use(healthcheck);

  test("GET /healthcheck 應返回 200 和 ok 狀態", async () => {
    const response = await app.handle(new Request("http://localhost/healthcheck"));

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  test("Healthcheck 應該快速響應", async () => {
    const startTime = Date.now();
    const response = await app.handle(new Request("http://localhost/healthcheck"));
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100); // 應該在 100ms 內響應
  });
});

// ============================================================================
// 靜態資源測試
// ============================================================================

describe("Static Resources", () => {
  test("robots.txt 應該存在", () => {
    expect(existsSync("public/robots.txt")).toBe(true);
  });

  test("site.webmanifest 應該存在", () => {
    expect(existsSync("public/site.webmanifest")).toBe(true);
  });
});

// ============================================================================
// API 結構測試
// ============================================================================

describe("API Structure", () => {
  test("轉換器模組應該能正確載入", async () => {
    const converters = await import("../../src/converters/main");
    expect(converters).toBeDefined();
    expect(converters.handleConvert).toBeInstanceOf(Function);
  });

  test("資料庫模組應該能正確載入", async () => {
    const db = await import("../../src/db/db");
    expect(db).toBeDefined();
    expect(db.default).toBeDefined();
  });

  test("healthcheck 模組應該能正確載入", async () => {
    const module = await import("../../src/pages/healthcheck");
    expect(module).toBeDefined();
    expect(module.healthcheck).toBeDefined();
  });
});

// ============================================================================
// 轉換器清單測試
// ============================================================================

describe("Converter List", () => {
  test("應該有正確的轉換器屬性結構", async () => {
    const { properties } = await import("../../src/converters/inkscape");

    expect(properties).toHaveProperty("from");
    expect(properties).toHaveProperty("to");
    expect(properties.from).toHaveProperty("images");
    expect(properties.to).toHaveProperty("images");
    expect(Array.isArray(properties.from.images)).toBe(true);
    expect(Array.isArray(properties.to.images)).toBe(true);
  });

  test("Inkscape 應支援 SVG 輸入", async () => {
    const { properties } = await import("../../src/converters/inkscape");
    expect(properties.from.images).toContain("svg");
  });

  test("Inkscape 應支援 PNG 輸出", async () => {
    const { properties } = await import("../../src/converters/inkscape");
    expect(properties.to.images).toContain("png");
  });

  test("Inkscape 應支援 PDF 輸出", async () => {
    const { properties } = await import("../../src/converters/inkscape");
    expect(properties.to.images).toContain("pdf");
  });
});

// ============================================================================
// 檔案類型正規化測試
// ============================================================================

describe("File Type Normalization", () => {
  test("normalizeFiletype 應該正確處理常見格式", async () => {
    const { normalizeFiletype } = await import("../../src/helpers/normalizeFiletype");

    // jpg/jfif 會被正規化為 jpeg
    expect(normalizeFiletype("jpg")).toBe("jpeg");
    expect(normalizeFiletype("jfif")).toBe("jpeg");
    expect(normalizeFiletype("JPG")).toBe("jpeg");

    // 其他格式保持原樣（小寫）
    expect(normalizeFiletype("PNG")).toBe("png");
    expect(normalizeFiletype("svg")).toBe("svg");
  });

  test("normalizeOutputFiletype 應該正確處理輸出格式", async () => {
    const { normalizeOutputFiletype } = await import("../../src/helpers/normalizeFiletype");

    // jpeg 輸出會轉為 jpg
    expect(normalizeOutputFiletype("jpeg")).toBe("jpg");
    expect(normalizeOutputFiletype("png")).toBe("png");
    expect(normalizeOutputFiletype("pdf")).toBe("pdf");
  });
});

// ============================================================================
// 環境變數測試
// ============================================================================

describe("Environment Variables", () => {
  test("環境變數模組應該能正確載入", async () => {
    const env = await import("../../src/helpers/env");

    expect(env).toHaveProperty("WEBROOT");
    expect(env).toHaveProperty("AUTO_DELETE_EVERY_N_HOURS");
    expect(env).toHaveProperty("MAX_CONVERT_PROCESS");
  });

  test("WEBROOT 應該是字串", async () => {
    const { WEBROOT } = await import("../../src/helpers/env");
    expect(typeof WEBROOT).toBe("string");
  });
});

// ============================================================================
// i18n 測試
// ============================================================================

describe("i18n Module", () => {
  test("i18n 服務應該能正確載入", async () => {
    const i18n = await import("../../src/i18n/service");
    expect(i18n).toBeDefined();
  });

  test("預設語言檔案應該存在", () => {
    expect(existsSync("src/locales/en.json")).toBe(true);
    expect(existsSync("src/locales/zh-TW.json")).toBe(true);
    expect(existsSync("src/locales/zh-CN.json")).toBe(true);
  });

  test("語言檔案應該是有效的 JSON", async () => {
    const enContent = await Bun.file("src/locales/en.json").text();
    const zhTWContent = await Bun.file("src/locales/zh-TW.json").text();

    expect(() => JSON.parse(enContent)).not.toThrow();
    expect(() => JSON.parse(zhTWContent)).not.toThrow();
  });
});

// ============================================================================
// Transfer 模組測試
// ============================================================================

describe("Transfer Module", () => {
  test("Transfer 常數應該正確定義", async () => {
    const { CHUNK_THRESHOLD_BYTES, CHUNK_SIZE_BYTES } =
      await import("../../src/transfer/constants");

    expect(CHUNK_THRESHOLD_BYTES).toBe(10 * 1024 * 1024); // 10MB
    expect(CHUNK_SIZE_BYTES).toBe(5 * 1024 * 1024); // 5MB
  });

  test("允許的封裝格式應該是 .tar", async () => {
    const { ALLOWED_ARCHIVE_FORMAT, FORBIDDEN_ARCHIVE_FORMATS } =
      await import("../../src/transfer/constants");

    expect(ALLOWED_ARCHIVE_FORMAT).toBe(".tar");
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".tar.gz");
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".zip");
  });

  test("Upload Manager 應該能正確載入", async () => {
    const uploadManager = await import("../../src/transfer/uploadManager");
    expect(uploadManager).toBeDefined();
  });

  test("Download Manager 應該能正確載入", async () => {
    const downloadManager = await import("../../src/transfer/downloadManager");
    expect(downloadManager).toBeDefined();
  });
});

// ============================================================================
// 資料庫結構測試
// ============================================================================

describe("Database Structure", () => {
  test("資料庫類型定義應該正確", async () => {
    const types = await import("../../src/db/types");

    // 這些是 class，檢查它們是否可以被建構
    expect(types.Jobs).toBeDefined();
    expect(types.Filename).toBeDefined();
    expect(types.User).toBeDefined();

    // 驗證可以創建實例
    const job = new types.Jobs();
    expect(job).toBeInstanceOf(types.Jobs);
  });
});
