/**
 * 格式轉換矩陣測試
 *
 * 測試目標：驗證 1000+ 種格式轉換組合
 *
 * 這個測試會：
 * 1. 自動發現所有轉換器支援的格式
 * 2. 生成所有可能的轉換組合
 * 3. 執行抽樣測試（避免耗時過長）
 * 4. 生成詳細的測試報告
 *
 * 執行方式：
 *   bun test tests/e2e/format-matrix.e2e.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// =============================================================================
// 配置
// =============================================================================

const E2E_OUTPUT_DIR = "tests/e2e/output/format-matrix";
const TIMEOUT = 60_000; // 60 秒超時

// 每個轉換器最大測試數
const MAX_TESTS_PER_CONVERTER = 20;

// =============================================================================
// 類型定義
// =============================================================================

interface ConverterInfo {
  name: string;
  available: boolean;
  from: string[];
  to: string[];
  combinations: [string, string][];
}

interface TestResult {
  converter: string;
  from: string;
  to: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface MatrixReport {
  generatedAt: string;
  converters: ConverterInfo[];
  totalCombinations: number;
  testedCombinations: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  results: TestResult[];
}

// =============================================================================
// 工具函數
// =============================================================================

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function isToolAvailable(command: string, args: string[] = ["--version"]): boolean {
  try {
    const result = spawnSync(command, args, {
      timeout: 5000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * 格式別名映射 - 將檔案副檔名轉換為 Pandoc 認識的格式名稱
 */
function normalizeFormatForPandoc(format: string): string {
  const aliases: Record<string, string> = {
    md: "markdown",
    txt: "plain",
    tex: "latex",
  };
  return aliases[format.toLowerCase()] || format.toLowerCase();
}

/**
 * 判斷格式是否需要特殊處理（如二進制格式需要真實檔案）
 */
function isComplexFormat(format: string): boolean {
  const complexFormats = ["epub", "docx", "odt", "pdf", "pptx", "xlsx"];
  return complexFormats.includes(format.toLowerCase());
}

// 根據格式生成測試內容
function createTestContent(format: string): Buffer | string {
  switch (format.toLowerCase()) {
    // 圖像格式
    case "svg":
      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue"/>
</svg>`;

    case "png":
      return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
        0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

    case "bmp": {
      const bmp = Buffer.alloc(70);
      bmp.write("BM", 0);
      bmp.writeUInt32LE(70, 2);
      bmp.writeUInt32LE(54, 10);
      bmp.writeUInt32LE(40, 14);
      bmp.writeInt32LE(1, 18);
      bmp.writeInt32LE(1, 22);
      bmp.writeUInt16LE(1, 26);
      bmp.writeUInt16LE(24, 28);
      bmp[54] = 0xff;
      bmp[55] = 0x00;
      bmp[56] = 0x00;
      return bmp;
    }

    // 文檔格式
    case "md":
    case "markdown":
      return `# 測試文檔

這是測試內容。

## 列表
- 項目 1
- 項目 2
`;

    case "html":
    case "htm":
      return `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body><h1>測試</h1><p>內容</p></body>
</html>`;

    case "txt":
    case "text":
      return "測試文字內容\nTest content\n";

    case "rst":
      return `測試標題
========

這是 reStructuredText 測試。
`;

    case "latex":
    case "tex":
      return `\\documentclass{article}
\\begin{document}
\\section{測試}
這是 LaTeX 測試。
\\end{document}`;

    // 資料格式
    case "json":
      return JSON.stringify({ name: "test", value: 42 }, null, 2);

    case "yaml":
    case "yml":
      return "name: test\nvalue: 42\n";

    case "toml":
      return 'name = "test"\nvalue = 42\n';

    case "xml":
      return '<?xml version="1.0"?>\n<root><name>test</name></root>';

    case "csv":
      return "name,value\ntest,42\n";

    case "tsv":
      return "name\tvalue\ntest\t42\n";

    default:
      return `Test content for ${format}`;
  }
}

// =============================================================================
// 轉換器配置
// =============================================================================

interface ConverterConfig {
  name: string;
  command: string;
  commandArgs?: string[];
  from: string[];
  to: string[];
  needsXvfb?: boolean;
}

const CONVERTERS: ConverterConfig[] = [
  {
    name: "inkscape",
    command: "inkscape",
    from: ["svg", "svgz"],
    to: ["png", "pdf", "eps", "ps", "emf", "wmf"],
    needsXvfb: true,
  },
  {
    name: "imagemagick",
    command: "magick",
    from: ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "tif", "webp", "ico", "ppm", "pgm", "pbm"],
    to: [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "bmp",
      "tiff",
      "tif",
      "webp",
      "ico",
      "ppm",
      "pgm",
      "pbm",
      "pdf",
    ],
  },
  {
    name: "graphicsmagick",
    command: "gm",
    commandArgs: ["version"],
    from: ["png", "jpg", "jpeg", "gif", "bmp", "tiff"],
    to: ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "pdf"],
  },
  {
    name: "pandoc",
    command: "pandoc",
    from: ["markdown", "html", "rst", "latex"],
    to: ["html", "docx", "odt", "rst", "latex", "mediawiki", "asciidoc", "org"],
  },
  {
    name: "dasel",
    command: "dasel",
    from: ["json", "yaml", "yml", "toml", "xml", "csv"],
    to: ["json", "yaml", "yml", "toml", "xml", "csv"],
  },
  {
    name: "potrace",
    command: "potrace",
    commandArgs: ["-v"],
    from: ["bmp", "pbm", "pgm", "ppm", "pnm"],
    to: ["svg", "eps", "ps", "pdf", "dxf"],
  },
  {
    name: "vtracer",
    command: "vtracer",
    from: ["png", "jpg", "jpeg", "bmp"],
    to: ["svg"],
  },
  {
    name: "resvg",
    command: "resvg",
    from: ["svg", "svgz"],
    to: ["png", "pdf"],
  },
  {
    name: "vips",
    command: "vips",
    from: ["png", "jpg", "jpeg", "tiff", "webp", "heif", "avif"],
    to: ["png", "jpg", "jpeg", "tiff", "webp", "heif", "avif"],
  },
  {
    name: "libreoffice",
    command: "soffice",
    from: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "html"],
    to: ["pdf", "docx", "xlsx", "pptx", "odt", "ods", "odp", "html", "txt"],
  },
  {
    name: "calibre",
    command: "ebook-convert",
    from: ["epub", "mobi", "azw", "azw3", "pdf", "html", "txt", "rtf", "docx"],
    to: ["epub", "mobi", "azw3", "pdf", "html", "txt", "docx"],
    needsXvfb: true,
  },
  {
    name: "ffmpeg",
    command: "ffmpeg",
    commandArgs: ["-version"],
    from: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "mp4", "mkv", "avi", "mov", "webm"],
    to: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "mp4", "mkv", "avi", "mov", "webm", "gif"],
  },
  {
    name: "libheif",
    command: "heif-convert",
    from: ["heic", "heif", "avif"],
    to: ["jpg", "jpeg", "png"],
  },
  {
    name: "libjxl",
    command: "cjxl",
    from: ["png", "jpg", "jpeg", "gif", "apng"],
    to: ["jxl"],
  },
];

// =============================================================================
// 主測試
// =============================================================================

const report: MatrixReport = {
  generatedAt: new Date().toISOString(),
  converters: [],
  totalCombinations: 0,
  testedCombinations: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  results: [],
};

beforeAll(() => {
  ensureDir(E2E_OUTPUT_DIR);
  console.log("\n🔍 發現轉換器... Discovering converters...\n");
});

afterAll(() => {
  // 生成報告
  const reportPath = join(E2E_OUTPUT_DIR, "matrix-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const summaryPath = join(E2E_OUTPUT_DIR, "matrix-summary.md");
  const summary = generateMarkdownSummary(report);
  writeFileSync(summaryPath, summary);

  console.log("\n" + "=".repeat(70));
  console.log("📊 格式轉換矩陣測試報告 Format Matrix Test Report");
  console.log("=".repeat(70));
  console.log(`轉換器數量 Converters: ${report.converters.length}`);
  console.log(`總組合數 Total Combinations: ${report.totalCombinations}`);
  console.log(`測試數 Tested: ${report.testedCombinations}`);
  console.log(`通過 Passed: ${report.passedTests}`);
  console.log(`失敗 Failed: ${report.failedTests}`);
  console.log(`跳過 Skipped: ${report.skippedTests}`);
  console.log(
    `成功率 Success Rate: ${((report.passedTests / (report.testedCombinations || 1)) * 100).toFixed(1)}%`,
  );
  console.log("=".repeat(70));
  console.log(`📁 報告路徑: ${reportPath}`);
  console.log(`📄 摘要路徑: ${summaryPath}`);
});

function generateMarkdownSummary(report: MatrixReport): string {
  let md = `# 格式轉換矩陣測試報告\n\n`;
  md += `生成時間: ${report.generatedAt}\n\n`;
  md += `## 摘要\n\n`;
  md += `| 指標 | 值 |\n`;
  md += `|------|----|\n`;
  md += `| 轉換器數量 | ${report.converters.length} |\n`;
  md += `| 總組合數 | ${report.totalCombinations} |\n`;
  md += `| 測試數 | ${report.testedCombinations} |\n`;
  md += `| 通過 | ${report.passedTests} |\n`;
  md += `| 失敗 | ${report.failedTests} |\n`;
  md += `| 跳過 | ${report.skippedTests} |\n`;
  md += `| 成功率 | ${((report.passedTests / (report.testedCombinations || 1)) * 100).toFixed(1)}% |\n`;
  md += `\n## 轉換器詳情\n\n`;

  for (const converter of report.converters) {
    md += `### ${converter.name}\n\n`;
    md += `- 狀態: ${converter.available ? "✅ 可用" : "❌ 不可用"}\n`;
    md += `- 輸入格式 (${converter.from.length}): ${converter.from.join(", ")}\n`;
    md += `- 輸出格式 (${converter.to.length}): ${converter.to.join(", ")}\n`;
    md += `- 組合數: ${converter.combinations.length}\n\n`;
  }

  md += `## 失敗的測試\n\n`;
  const failedResults = report.results.filter((r) => !r.success);
  if (failedResults.length === 0) {
    md += `無失敗的測試 ✅\n`;
  } else {
    md += `| 轉換器 | 來源 | 目標 | 錯誤 |\n`;
    md += `|--------|------|------|------|\n`;
    for (const result of failedResults) {
      md += `| ${result.converter} | ${result.from} | ${result.to} | ${result.error || "Unknown"} |\n`;
    }
  }

  return md;
}

// =============================================================================
// 測試套件
// =============================================================================

describe("📊 格式轉換矩陣 Format Conversion Matrix", () => {
  describe("發現可用轉換器 Discover Available Converters", () => {
    test("檢測所有轉換器", () => {
      for (const config of CONVERTERS) {
        const available = isToolAvailable(config.command, config.commandArgs);
        const combinations: [string, string][] = [];

        // 生成所有組合
        for (const from of config.from) {
          for (const to of config.to) {
            if (from !== to) {
              combinations.push([from, to]);
            }
          }
        }

        const info: ConverterInfo = {
          name: config.name,
          available,
          from: config.from,
          to: config.to,
          combinations,
        };

        report.converters.push(info);
        report.totalCombinations += combinations.length;

        const icon = available ? "✅" : "❌";
        console.log(
          `  ${icon} ${config.name}: ${combinations.length} 組合 (${available ? "可用" : "不可用"})`,
        );
      }

      console.log(`\n  📈 總組合數: ${report.totalCombinations}`);
      expect(report.converters.length).toBeGreaterThan(0);
    });
  });

  describe("圖像格式轉換 Image Format Conversions", () => {
    const imageConverters = [
      "inkscape",
      "imagemagick",
      "graphicsmagick",
      "potrace",
      "vtracer",
      "resvg",
      "vips",
    ];

    for (const converterName of imageConverters) {
      describe(`${converterName}`, () => {
        test(
          `測試格式轉換`,
          async () => {
            const converter = report.converters.find((c) => c.name === converterName);
            if (!converter) {
              report.skippedTests++;
              console.log(`  ⏭ ${converterName}: 轉換器未找到`);
              return;
            }

            if (!converter.available) {
              report.skippedTests += converter.combinations.length;
              console.log(
                `  ⏭ ${converterName}: 工具不可用，跳過 ${converter.combinations.length} 個測試`,
              );
              return;
            }

            // 抽樣測試
            const sampled = sampleCombinations(converter.combinations, MAX_TESTS_PER_CONVERTER);
            console.log(
              `  🧪 ${converterName}: 測試 ${sampled.length}/${converter.combinations.length} 個組合`,
            );

            for (const [from, to] of sampled) {
              report.testedCombinations++;
              const startTime = Date.now();

              try {
                // 建立測試檔案
                const inputDir = join(E2E_OUTPUT_DIR, converterName);
                ensureDir(inputDir);
                const inputPath = join(inputDir, `input.${from}`);
                const outputPath = join(inputDir, `output_${from}_to_${to}.${to}`);

                const content = createTestContent(from);
                if (Buffer.isBuffer(content)) {
                  writeFileSync(inputPath, content);
                } else {
                  writeFileSync(inputPath, content, "utf-8");
                }

                // 動態導入並執行轉換
                const module = await import(`../../src/converters/${converterName}`);
                await module.convert(inputPath, from, to, outputPath);

                const duration = Date.now() - startTime;
                const success = existsSync(outputPath);

                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success,
                  duration,
                });

                if (success) {
                  report.passedTests++;
                } else {
                  report.failedTests++;
                  console.log(`    ❌ ${from} → ${to}: 輸出檔案不存在`);
                }
              } catch (error) {
                const duration = Date.now() - startTime;
                report.failedTests++;
                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success: false,
                  duration,
                  error: String(error),
                });
                console.log(`    ❌ ${from} → ${to}: ${error}`);
              }
            }
          },
          TIMEOUT * MAX_TESTS_PER_CONVERTER,
        );
      });
    }
  });

  describe("文檔格式轉換 Document Format Conversions", () => {
    const docConverters = ["pandoc", "libreoffice", "calibre"];

    for (const converterName of docConverters) {
      describe(`${converterName}`, () => {
        test(
          `測試格式轉換`,
          async () => {
            const converter = report.converters.find((c) => c.name === converterName);
            if (!converter) {
              report.skippedTests++;
              console.log(`  ⏭ ${converterName}: 轉換器未找到`);
              return;
            }

            if (!converter.available) {
              report.skippedTests += converter.combinations.length;
              console.log(
                `  ⏭ ${converterName}: 工具不可用，跳過 ${converter.combinations.length} 個測試`,
              );
              return;
            }

            // 抽樣測試
            const sampled = sampleCombinations(converter.combinations, MAX_TESTS_PER_CONVERTER);
            console.log(
              `  🧪 ${converterName}: 測試 ${sampled.length}/${converter.combinations.length} 個組合`,
            );

            for (const [from, to] of sampled) {
              report.testedCombinations++;
              const startTime = Date.now();

              try {
                const inputDir = join(E2E_OUTPUT_DIR, converterName);
                ensureDir(inputDir);
                const inputPath = join(inputDir, `input.${from}`);
                const outputPath = join(inputDir, `output_${from}_to_${to}.${to}`);

                // 跳過複雜的二進制輸入格式（需要真實檔案）
                if (isComplexFormat(from)) {
                  report.skippedTests++;
                  continue;
                }

                const content = createTestContent(from);
                if (Buffer.isBuffer(content)) {
                  writeFileSync(inputPath, content);
                } else {
                  writeFileSync(inputPath, content, "utf-8");
                }

                const module = await import(`../../src/converters/${converterName}`);
                // 對於 Pandoc，正規化格式名稱
                const normalizedFrom =
                  converterName === "pandoc" ? normalizeFormatForPandoc(from) : from;
                const normalizedTo = converterName === "pandoc" ? normalizeFormatForPandoc(to) : to;
                await module.convert(inputPath, normalizedFrom, normalizedTo, outputPath);

                const duration = Date.now() - startTime;
                const success = existsSync(outputPath);

                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success,
                  duration,
                });

                if (success) {
                  report.passedTests++;
                } else {
                  report.failedTests++;
                  console.log(`    ❌ ${from} → ${to}: 輸出檔案不存在`);
                }
              } catch (error) {
                const duration = Date.now() - startTime;
                report.failedTests++;
                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success: false,
                  duration,
                  error: String(error),
                });
                console.log(`    ❌ ${from} → ${to}: ${error}`);
              }
            }
          },
          TIMEOUT * MAX_TESTS_PER_CONVERTER,
        );
      });
    }
  });

  describe("資料格式轉換 Data Format Conversions", () => {
    const dataConverters = ["dasel"];

    for (const converterName of dataConverters) {
      describe(`${converterName}`, () => {
        test(
          `測試格式轉換`,
          async () => {
            const converter = report.converters.find((c) => c.name === converterName);
            if (!converter) {
              report.skippedTests++;
              console.log(`  ⏭ ${converterName}: 轉換器未找到`);
              return;
            }

            if (!converter.available) {
              report.skippedTests += converter.combinations.length;
              console.log(
                `  ⏭ ${converterName}: 工具不可用，跳過 ${converter.combinations.length} 個測試`,
              );
              return;
            }

            const sampled = sampleCombinations(converter.combinations, MAX_TESTS_PER_CONVERTER);
            console.log(
              `  🧪 ${converterName}: 測試 ${sampled.length}/${converter.combinations.length} 個組合`,
            );

            for (const [from, to] of sampled) {
              report.testedCombinations++;
              const startTime = Date.now();

              try {
                const inputDir = join(E2E_OUTPUT_DIR, converterName);
                ensureDir(inputDir);
                const inputPath = join(inputDir, `input.${from}`);
                const outputPath = join(inputDir, `output_${from}_to_${to}.${to}`);

                const content = createTestContent(from);
                writeFileSync(inputPath, content, "utf-8");

                const module = await import(`../../src/converters/${converterName}`);
                await module.convert(inputPath, from, to, outputPath);

                const duration = Date.now() - startTime;
                const success = existsSync(outputPath);

                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success,
                  duration,
                });

                if (success) {
                  report.passedTests++;
                } else {
                  report.failedTests++;
                }
              } catch (error) {
                const duration = Date.now() - startTime;
                report.failedTests++;
                report.results.push({
                  converter: converterName,
                  from,
                  to,
                  success: false,
                  duration,
                  error: String(error),
                });
              }
            }
          },
          TIMEOUT * MAX_TESTS_PER_CONVERTER,
        );
      });
    }
  });
});

// =============================================================================
// 輔助函數
// =============================================================================

function sampleCombinations(
  combinations: [string, string][],
  maxCount: number,
): [string, string][] {
  if (combinations.length <= maxCount) {
    return combinations;
  }

  // 隨機抽樣
  const shuffled = [...combinations].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, maxCount);
}
