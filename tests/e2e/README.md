# E2E 測試 (End-to-End Tests)

此目錄包含端對端測試，用於驗證完整的轉換流程。

## 測試類型

### 1. 轉換器 E2E 測試 (`converters.e2e.test.ts`)

測試真實的檔案轉換，需要安裝對應的轉換工具：

- **Inkscape**: SVG ↔ PNG, PDF, EPS 等
- **ImageMagick**: 圖像格式轉換
- **LibreOffice**: 文件格式轉換
- **FFmpeg**: 音視頻轉換
- **Pandoc**: 文件格式轉換

### 2. API E2E 測試 (`api.e2e.test.ts`)

測試完整的 HTTP API 流程：

- 上傳檔案
- 啟動轉換
- 查詢狀態
- 下載結果

## 執行方式

```bash
# 執行所有 E2E 測試
bun test tests/e2e

# 只執行轉換器 E2E 測試
bun test tests/e2e/converters.e2e.test.ts

# 只執行 API E2E 測試
bun test tests/e2e/api.e2e.test.ts
```

## 環境要求

E2E 測試需要安裝實際的轉換工具。在 Docker 環境中運行可確保所有工具都已安裝。

測試會自動偵測可用的工具，跳過不可用的測試。

## 測試資料

測試使用 `tests/e2e/fixtures/` 目錄中的測試檔案。這些是小型的測試檔案，用於快速驗證轉換功能。

## 注意事項

1. E2E 測試比單元測試慢，通常只在 CI/CD 中運行
2. 測試會在 `tests/e2e/output/` 目錄中產生輸出檔案
3. 每次測試前會清理輸出目錄
