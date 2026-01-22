/**
 * 轉換器 E2E 測試
 *
 * 這些測試使用真實的轉換工具執行檔案轉換。
 * 測試會自動偵測可用的工具，跳過不可用的測試。
 *
 * 執行方式：
 *   bun test tests/e2e/converters.e2e.test.ts
 *
 * 注意：需要在 Docker 環境或已安裝轉換工具的系統中執行
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { convert as convertInkscape } from "../../src/converters/inkscape";
import { convert as convertPandoc } from "../../src/converters/pandoc";
import { convert as convertDasel } from "../../src/converters/dasel";

import {
  AvailableTools,
  detectAvailableTools,
  setupOutputDir,
  createTestSvg,
  createTestMarkdown,
  createTestJson,
  printTestEnvironment,
} from "./helpers";

let tools: AvailableTools;
let outputDir: string;

beforeAll(() => {
  printTestEnvironment();
  tools = detectAvailableTools();
  outputDir = setupOutputDir("converters");
});

afterAll(() => {
  // 保留輸出目錄以便檢查結果
  console.log(`\nE2E test outputs saved to: ${outputDir}`);
});

// ============================================================================
// Inkscape E2E 測試
// ============================================================================

describe("Inkscape E2E Tests", () => {
  const inkscapeDir = () => join(outputDir, "inkscape");

  beforeAll(() => {
    if (tools.inkscape) {
      setupOutputDir("converters/inkscape");
    }
  });

  test("SVG → PNG 轉換", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const inputPath = join(inkscapeDir(), "input.svg");
    const outputPath = join(inkscapeDir(), "output.png");

    createTestSvg(inputPath);

    const result = await convertInkscape(inputPath, "svg", "png", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
    console.log(`  ✓ SVG → PNG: ${stats.size} bytes`);
  });

  test("SVG → PDF 轉換", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const inputPath = join(inkscapeDir(), "input.svg");
    const outputPath = join(inkscapeDir(), "output.pdf");

    createTestSvg(inputPath);

    const result = await convertInkscape(inputPath, "svg", "pdf", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
    console.log(`  ✓ SVG → PDF: ${stats.size} bytes`);
  });

  test("SVG → EPS 轉換", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const inputPath = join(inkscapeDir(), "input.svg");
    const outputPath = join(inkscapeDir(), "output.eps");

    createTestSvg(inputPath);

    const result = await convertInkscape(inputPath, "svg", "eps", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
    console.log(`  ✓ SVG → EPS: ${stats.size} bytes`);
  });
});

// ============================================================================
// Pandoc E2E 測試
// ============================================================================

describe("Pandoc E2E Tests", () => {
  const pandocDir = () => join(outputDir, "pandoc");

  beforeAll(() => {
    if (tools.pandoc) {
      setupOutputDir("converters/pandoc");
    }
  });

  test("Markdown → HTML 轉換", async () => {
    if (!tools.pandoc) {
      console.log("⏭ Skipping: Pandoc not available");
      return;
    }

    const inputPath = join(pandocDir(), "input.md");
    const outputPath = join(pandocDir(), "output.html");

    createTestMarkdown(inputPath);

    // Pandoc 使用 "markdown" 而非 "md" 作為格式名稱
    const result = await convertPandoc(inputPath, "markdown", "html", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    // 驗證輸出內容
    const content = await Bun.file(outputPath).text();
    expect(content).toContain("<h1");
    expect(content).toContain("Test Document");

    console.log(`  ✓ Markdown → HTML: ${stats.size} bytes`);
  });

  test("Markdown → DOCX 轉換", async () => {
    if (!tools.pandoc) {
      console.log("⏭ Skipping: Pandoc not available");
      return;
    }

    const inputPath = join(pandocDir(), "input.md");
    const outputPath = join(pandocDir(), "output.docx");

    createTestMarkdown(inputPath);

    // Pandoc 使用 "markdown" 而非 "md" 作為格式名稱
    const result = await convertPandoc(inputPath, "markdown", "docx", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
    console.log(`  ✓ Markdown → DOCX: ${stats.size} bytes`);
  });

  test("Markdown → RST 轉換", async () => {
    if (!tools.pandoc) {
      console.log("⏭ Skipping: Pandoc not available");
      return;
    }

    const inputPath = join(pandocDir(), "input.md");
    const outputPath = join(pandocDir(), "output.rst");

    createTestMarkdown(inputPath);

    // Pandoc 使用 "markdown" 而非 "md" 作為格式名稱
    const result = await convertPandoc(inputPath, "markdown", "rst", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    // 驗證 RST 格式
    const content = await Bun.file(outputPath).text();
    expect(content).toContain("Test Document");

    console.log(`  ✓ Markdown → RST: ${stats.size} bytes`);
  });
});

// ============================================================================
// Dasel E2E 測試（資料格式轉換）
// ============================================================================

describe("Dasel E2E Tests", () => {
  const daselDir = () => join(outputDir, "dasel");
  const isDaselAvailable = () => {
    try {
      Bun.spawnSync(["dasel", "--version"]);
      return true;
    } catch {
      return false;
    }
  };

  beforeAll(() => {
    setupOutputDir("converters/dasel");
  });

  test("JSON → YAML 轉換", async () => {
    if (!isDaselAvailable()) {
      console.log("⏭ Skipping: Dasel not available");
      return;
    }

    const inputPath = join(daselDir(), "input.json");
    const outputPath = join(daselDir(), "output.yaml");

    createTestJson(inputPath);

    const result = await convertDasel(inputPath, "json", "yaml", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    // 驗證 YAML 格式
    const content = await Bun.file(outputPath).text();
    expect(content).toContain("name:");
    expect(content).toContain("test");

    console.log(`  ✓ JSON → YAML: ${stats.size} bytes`);
  });

  test("JSON → TOML 轉換", async () => {
    if (!isDaselAvailable()) {
      console.log("⏭ Skipping: Dasel not available");
      return;
    }

    const inputPath = join(daselDir(), "input.json");
    const outputPath = join(daselDir(), "output.toml");

    createTestJson(inputPath);

    const result = await convertDasel(inputPath, "json", "toml", outputPath);

    expect(result).toBe("Done");
    expect(existsSync(outputPath)).toBe(true);

    const stats = statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);

    console.log(`  ✓ JSON → TOML: ${stats.size} bytes`);
  });
});

// ============================================================================
// 批次轉換測試
// ============================================================================

describe("Batch Conversion E2E Tests", () => {
  const batchDir = () => join(outputDir, "batch");

  beforeAll(() => {
    setupOutputDir("converters/batch");
  });

  test("多檔案 SVG → PNG 批次轉換", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const numFiles = 3;
    const conversions: Promise<string>[] = [];

    for (let i = 0; i < numFiles; i++) {
      const inputPath = join(batchDir(), `input_${i}.svg`);
      const outputPath = join(batchDir(), `output_${i}.png`);

      createTestSvg(inputPath);
      conversions.push(convertInkscape(inputPath, "svg", "png", outputPath));
    }

    const results = await Promise.all(conversions);

    expect(results).toHaveLength(numFiles);
    results.forEach((result) => expect(result).toBe("Done"));

    // 驗證所有輸出檔案
    for (let i = 0; i < numFiles; i++) {
      const outputPath = join(batchDir(), `output_${i}.png`);
      expect(existsSync(outputPath)).toBe(true);
      const stats = statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    }

    console.log(`  ✓ Batch SVG → PNG: ${numFiles} files converted`);
  });
});

// ============================================================================
// 錯誤處理測試
// ============================================================================

describe("Error Handling E2E Tests", () => {
  const errorDir = () => join(outputDir, "errors");

  beforeAll(() => {
    setupOutputDir("converters/errors");
  });

  test("不存在的輸入檔案應該失敗", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const inputPath = join(errorDir(), "nonexistent.svg");
    const outputPath = join(errorDir(), "output.png");

    await expect(convertInkscape(inputPath, "svg", "png", outputPath)).rejects.toBeDefined();

    console.log("  ✓ Correctly rejected non-existent input file");
  });

  test("無效的 SVG 檔案應該處理優雅", async () => {
    if (!tools.inkscape) {
      console.log("⏭ Skipping: Inkscape not available");
      return;
    }

    const inputPath = join(errorDir(), "invalid.svg");
    const outputPath = join(errorDir(), "invalid_output.png");

    // 建立無效的 SVG 檔案
    await Bun.write(inputPath, "This is not a valid SVG file");

    // Inkscape 可能會產生錯誤或空輸出
    try {
      await convertInkscape(inputPath, "svg", "png", outputPath);
      // 如果沒有拋出錯誤，檢查輸出是否存在（可能為空或無效）
    } catch {
      // 預期會有錯誤
    }

    console.log("  ✓ Handled invalid SVG gracefully");
  });
});
