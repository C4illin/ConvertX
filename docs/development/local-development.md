# 本地開發

本文件說明如何在本地環境進行 ConvertX-CN 開發。

---

## 環境需求

- **Node.js** 20+ 或 **Bun** 1.0+
- **Docker**（用於測試）
- **Git**

### 可選

- **Rust** 1.75+（開發 API Server）
- 轉換工具（FFmpeg、ImageMagick 等）

---

## 快速開始

### 1. Clone 專案

```bash
git clone https://github.com/pi-docket/ConvertX-CN.git
cd ConvertX-CN
```

### 2. 安裝依賴

```bash
# 使用 Bun（推薦）
bun install

# 或使用 npm
npm install
```

### 3. 啟動開發伺服器

```bash
bun run dev
```

開啟 `http://localhost:3000`

---

## 開發工具

### 程式碼格式化

```bash
# Prettier
bun run format

# ESLint
bun run lint
```

### 類型檢查

```bash
bun run typecheck
```

### 建構

```bash
bun run build
```

---

## 目錄說明

| 目錄          | 說明       |
| ------------- | ---------- |
| `src/`        | 前端原始碼 |
| `public/`     | 靜態資源   |
| `api-server/` | API Server |
| `tests/`      | 測試檔案   |
| `docs/`       | 文件       |
| `scripts/`    | 腳本       |

---

## 常見開發任務

### 新增轉換器

1. 在 `src/converters/` 建立新檔案
2. 定義輸入/輸出格式
3. 在 `src/converters/main.ts` 註冊

```typescript
// src/converters/myconverter.ts
export const myConverter: Converter = {
  id: "myconverter",
  name: "My Converter",
  inputFormats: ["abc", "xyz"],
  outputFormats: ["pdf", "txt"],
  convert: async (input, output, format) => {
    // 轉換邏輯
  },
};
```

### 新增翻譯

1. 在 `src/locales/` 新增或修改翻譯檔
2. 在 `src/i18n/index.ts` 註冊（如果是新語言）

```json
// src/locales/xx.json
{
  "title": "ConvertX-CN",
  "upload": "上傳",
  ...
}
```

### 修改樣式

TailwindCSS 設定在 `tailwind.config.js`。

```bash
# 重新生成 CSS
bun run build:css
```

---

## API Server 開發

### 環境設定

```bash
cd api-server
```

### 建構

```bash
cargo build
```

### 執行

```bash
cargo run
```

### 測試

```bash
cargo test
```

---

## Docker 開發

### 建構本地映像

```bash
docker build -t convertx-cn-dev .
```

### 使用本地映像

```yaml
# docker-compose.yml
services:
  convertx:
    image: convertx-cn-dev
    # ...
```

---

## 偵錯

### 前端偵錯

使用瀏覽器開發者工具（F12）。

### 後端偵錯

```bash
# 詳細日誌
DEBUG=* bun run dev
```

### API Server 偵錯

```bash
RUST_LOG=debug cargo run
```

---

## 相關文件

- [專案結構](project-structure.md)
- [貢獻指南](contribution.md)
- [測試策略](../testing/test-strategy.md)
