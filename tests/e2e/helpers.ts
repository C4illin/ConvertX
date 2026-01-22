/**
 * E2E 測試輔助工具
 *
 * 提供 E2E 測試所需的共用功能：
 * - 工具可用性偵測
 * - 測試檔案生成
 * - 輸出目錄管理
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** E2E 測試輸出目錄 */
export const E2E_OUTPUT_DIR = "tests/e2e/output";

/** E2E 測試 fixtures 目錄 */
export const E2E_FIXTURES_DIR = "tests/e2e/fixtures";

/**
 * 檢查命令是否可用
 */
export function isCommandAvailable(command: string): boolean {
  try {
    const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
      stdio: "pipe",
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * 取得命令版本
 */
export function getCommandVersion(command: string, versionFlag = "--version"): string | null {
  try {
    const result = execSync(`${command} ${versionFlag}`, {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}

/**
 * 可用的轉換工具
 */
export interface AvailableTools {
  inkscape: boolean;
  imagemagick: boolean;
  graphicsmagick: boolean;
  libreoffice: boolean;
  ffmpeg: boolean;
  pandoc: boolean;
  calibre: boolean;
  potrace: boolean;
  vips: boolean;
  resvg: boolean;
}

/**
 * 偵測所有可用的轉換工具
 */
export function detectAvailableTools(): AvailableTools {
  return {
    inkscape: isCommandAvailable("inkscape"),
    imagemagick: isCommandAvailable("magick") || isCommandAvailable("convert"),
    graphicsmagick: isCommandAvailable("gm"),
    libreoffice: isCommandAvailable("soffice") || isCommandAvailable("libreoffice"),
    ffmpeg: isCommandAvailable("ffmpeg"),
    pandoc: isCommandAvailable("pandoc"),
    calibre: isCommandAvailable("ebook-convert"),
    potrace: isCommandAvailable("potrace"),
    vips: isCommandAvailable("vips"),
    resvg: isCommandAvailable("resvg"),
  };
}

/**
 * 清理並建立輸出目錄
 */
export function setupOutputDir(subDir?: string): string {
  const outputDir = subDir ? join(E2E_OUTPUT_DIR, subDir) : E2E_OUTPUT_DIR;

  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });

  return outputDir;
}

/**
 * 確保 fixtures 目錄存在
 */
export function ensureFixturesDir(): string {
  if (!existsSync(E2E_FIXTURES_DIR)) {
    mkdirSync(E2E_FIXTURES_DIR, { recursive: true });
  }
  return E2E_FIXTURES_DIR;
}

/**
 * 建立測試用 SVG 檔案
 */
export function createTestSvg(outputPath: string): void {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" fill="#4285f4" rx="10"/>
  <circle cx="50" cy="50" r="25" fill="#ffffff"/>
  <text x="50" y="55" text-anchor="middle" font-size="12" fill="#333">Test</text>
</svg>`;
  writeFileSync(outputPath, svgContent);
}

/**
 * 建立測試用 PNG 檔案（1x1 像素）
 */
export function createTestPng(outputPath: string): void {
  // 最小的有效 PNG 檔案 (1x1 紅色像素)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // bit depth, color type, etc
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, // compressed data
    0x01, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, // checksum
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
    0xae, 0x42, 0x60, 0x82,
  ]);
  writeFileSync(outputPath, pngBuffer);
}

/**
 * 建立測試用純文字檔案
 */
export function createTestText(outputPath: string, content?: string): void {
  const textContent =
    content ||
    `# Test Document

This is a test document for E2E testing.

## Features

- Feature 1
- Feature 2
- Feature 3

## Conclusion

End of test document.
`;
  writeFileSync(outputPath, textContent);
}

/**
 * 建立測試用 HTML 檔案
 */
export function createTestHtml(outputPath: string): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Document</title>
</head>
<body>
  <h1>Test Document</h1>
  <p>This is a test paragraph for E2E testing.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</body>
</html>`;
  writeFileSync(outputPath, htmlContent);
}

/**
 * 建立測試用 Markdown 檔案
 */
export function createTestMarkdown(outputPath: string): void {
  const mdContent = `# Test Document

This is a **test** document for E2E testing.

## Code Example

\`\`\`javascript
console.log("Hello, World!");
\`\`\`

## List

1. First item
2. Second item
3. Third item

## Table

| Name | Value |
|------|-------|
| A    | 1     |
| B    | 2     |
`;
  writeFileSync(outputPath, mdContent);
}

/**
 * 建立測試用 JSON 檔案
 */
export function createTestJson(outputPath: string): void {
  const jsonContent = {
    name: "test",
    version: "1.0.0",
    description: "Test JSON for E2E testing",
    data: {
      items: [1, 2, 3],
      nested: {
        key: "value",
      },
    },
  };
  writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2));
}

/**
 * 等待檔案存在
 */
export async function waitForFile(filePath: string, timeoutMs = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (existsSync(filePath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * 印出測試環境資訊
 */
export function printTestEnvironment(): void {
  console.log("\n=== E2E Test Environment ===");
  console.log(`Platform: ${process.platform}`);
  console.log(`Node.js: ${process.version}`);

  const tools = detectAvailableTools();
  console.log("\nAvailable tools:");
  for (const [tool, available] of Object.entries(tools)) {
    const status = available ? "✓" : "✗";
    console.log(`  ${status} ${tool}`);
  }
  console.log("============================\n");
}
