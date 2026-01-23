# E2E 測試

本文件說明如何執行與撰寫 ConvertX-CN 的端對端測試。

---

## 概述

E2E 測試模擬真實使用者操作，驗證完整的使用流程。

### 測試範圍

- ✅ 檔案上傳
- ✅ 格式轉換
- ✅ 檔案下載
- ✅ 使用者認證
- ✅ 歷史記錄

---

## 執行測試

### 前置條件

1. 啟動 ConvertX-CN 服務
2. 確保 Docker 可用

### 執行命令

```bash
# 執行所有 E2E 測試
bun run test:e2e

# 使用腳本
./scripts/run-e2e-tests.sh

# 指定測試檔案
bun run test:e2e tests/e2e/upload.test.ts
```

### 使用 Docker

```bash
# 啟動測試環境
docker compose -f compose.test.yml up -d

# 執行測試
bun run test:e2e

# 清理
docker compose -f compose.test.yml down
```

---

## 測試結構

```
tests/e2e/
├── upload.test.ts      # 上傳測試
├── convert.test.ts     # 轉換測試
├── download.test.ts    # 下載測試
├── auth.test.ts        # 認證測試
└── fixtures/           # 測試資料
    ├── sample.docx
    ├── sample.pdf
    └── sample.png
```

---

## 撰寫測試

### 基本範例

```typescript
// tests/e2e/upload.test.ts
import { test, expect } from "@playwright/test";

test.describe("File Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should upload a file", async ({ page }) => {
    // 選擇檔案
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/e2e/fixtures/sample.docx");

    // 驗證檔案名稱顯示
    await expect(page.locator(".file-name")).toContainText("sample.docx");
  });
});
```

### 轉換測試

```typescript
// tests/e2e/convert.test.ts
test("should convert docx to pdf", async ({ page }) => {
  // 上傳檔案
  await page.setInputFiles('input[type="file"]', "tests/e2e/fixtures/sample.docx");

  // 選擇目標格式
  await page.selectOption("#output-format", "pdf");

  // 點擊轉換
  await page.click("#convert-button");

  // 等待完成
  await expect(page.locator(".status")).toContainText("完成", { timeout: 60000 });
});
```

### 認證測試

```typescript
// tests/e2e/auth.test.ts
test("should login successfully", async ({ page }) => {
  await page.goto("/login");

  await page.fill("#email", "test@example.com");
  await page.fill("#password", "password123");
  await page.click("#login-button");

  await expect(page).toHaveURL("/");
  await expect(page.locator(".user-menu")).toBeVisible();
});
```

---

## 設定

### Playwright 設定

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
```

---

## 除錯

### 互動模式

```bash
bun run test:e2e --debug
```

### 檢視報告

```bash
bun run test:e2e --reporter=html
npx playwright show-report
```

### 錄製測試

```bash
npx playwright codegen http://localhost:3000
```

---

## 相關文件

- [測試策略](test-strategy.md)
- [CI/CD](ci-cd.md)
- [本地開發](../development/local-development.md)
