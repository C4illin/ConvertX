![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務** — 一個 Docker 命令，5 分鐘部署完成

[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)

---

## 為什麼選擇 ConvertX-CN？

ConvertX-CN 不只是轉檔工具，而是 **文件轉換與翻譯的一站式平台**：

- **1000+ 格式全支援**：文件、圖片、影音、電子書一次搞定
- **20+ 轉換引擎整合**：LibreOffice、FFmpeg、Pandoc 全到位
- **中文友善設計**：內建中日韓字型與 OCR，告別亂碼
- **65 種介面語言**：跨國團隊無障礙使用
- **MinerU 引擎**：強化文件解析與穩定度
- **PDFMathTranslate**：數學、工程、AI 論文公式安全翻譯與完整保留

---

## 線上示範

想先試用再部署？歡迎使用我們的示範站：

🔗 **https://convertx-cn.bioailab.qzz.io**

| 項目     | 內容              |
| -------- | ----------------- |
| 範例帳號 | admin@example.com |
| 範例密碼 | admin             |

> ⚠️ 示範站僅供測試，請勿上傳敏感檔案。資料可能定期清除。

---

## 快速啟動（Docker Run）

### 1. 建立資料夾

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn
```

### 2. 啟動容器

JWT_SECRET=請改成你自己的隨機字串至少32字元

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=e78a2da4-135f-06a8-fa46-17ef7990f5d1 \
  convertx/convertx-cn:latest
```

### 3. 開啟瀏覽器

```bash
  http://localhost:3000
```

> 首次下載約 4-6 GB，請耐心等待。

---

## Docker Compose（推薦）

### 1. 建立專案資料夾

### Linux / macOS

```bash
mkdir -p ~/convertx-cn && cd ~/convertx-cn
```

### Windows PowerShell

```bash
mkdir C:\convertx-cn; cd C:\convertx-cn
```

### Windows CMD

```bash
mkdir C:\convertx-cn
cd C:\convertx-cn
```

### 2. 建立 docker-compose.yml（在專案資料夾下）

- 範例內容（請修改 JWT_SECRET=請改成你自己的隨機字串至少32字元）：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    container_name: convertx-cn
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=e78a2da4-135f-06a8-fa46-17ef7990f5d1
```

### 3. 啟動：

```bash
docker compose up -d
```

更多範例 → [docs/docker-compose/](docs/docker-compose/)

---

## 重要：資料夾說明

`./data` 是你**主機上的實體資料夾**，用於存放上傳檔案、轉換結果與使用者資料。

| 作業系統      | 建立指令                      |
| ------------- | ----------------------------- |
| Linux / macOS | `mkdir -p ~/convertx-cn/data` |
| Windows (PS)  | `mkdir C:\convertx-cn\data`   |
| Windows (CMD) | `mkdir C:\convertx-cn\data`   |

> 若不先建立，Docker 會建立匿名 volume，導致資料難以存取或備份。

---

## 必要參數

| 參數         | 說明                               |
| ------------ | ---------------------------------- |
| `./data`     | 主機資料夾，必須先建立             |
| `JWT_SECRET` | 登入驗證金鑰，不設會每次重啟被登出 |

其他環境變數 → [docs/config/environment.md](docs/config/environment.md)

---

## 常見問題

| 問題                 | 解法                                           |
| -------------------- | ---------------------------------------------- |
| 登入後又被踢回登入頁 | 加上 `HTTP_ALLOWED=true` 或 `TRUST_PROXY=true` |
| 重啟後資料消失       | 確認 `./data:/app/data` 且資料夾存在           |
| 重啟後被登出         | 設定固定的 `JWT_SECRET`                        |

更多問題 → [docs/faq.md](docs/faq.md)

---

## 支援格式

| 轉換器           | 用途     | 格式數 |
| ---------------- | -------- | ------ |
| FFmpeg           | 影音     | 400+   |
| ImageMagick      | 圖片     | 200+   |
| LibreOffice      | 文件     | 60+    |
| Pandoc           | 文件     | 100+   |
| Calibre          | 電子書   | 40+    |
| Inkscape         | 向量圖   | 20+    |
| MinerU           | 文件→MD  | 2      |
| PDFMathTranslate | PDF 翻譯 | 15+    |

完整列表 → [docs/converters.md](docs/converters.md)

---

## Dark Mode

ConvertX-CN 支援亮色與暗色主題。

- 可手動切換主題（點擊導覽列的太陽/月亮圖示）
- 偏好設定自動儲存於瀏覽器
- 預設跟隨系統色彩偏好

---

## MinerU

ConvertX 內建文件轉換引擎。

- md-t（表格以 Markdown 呈現）
- md-i（表格以圖片呈現）

輸出格式：.tar（不壓縮封裝）

---

## PDFMathTranslate 引擎

PDFMathTranslate 是一個內容轉換引擎，用於翻譯 PDF 文件同時保留數學公式與排版。

### 功能特點

- 📊 保留數學公式、圖表、目錄與註解
- 🌐 支援多種目標語言（中文、英文、日文、韓文等）
- 🤖 支援多種翻譯服務（Google、DeepL、OpenAI 等）

### 輸出格式

所有輸出一律打包為 `.tar` 檔案，包含：

- `original.pdf` — 原始 PDF 文件
- `translated-<lang>.pdf` — 翻譯後的 PDF 文件

### 可用的目標格式

```
PDFMathTranslate
├─ pdf-en    （翻譯為英文）
├─ pdf-zh    （翻譯為簡體中文）
├─ pdf-zh-TW （翻譯為繁體中文）
├─ pdf-ja    （翻譯為日文）
├─ pdf-ko    （翻譯為韓文）
├─ pdf-de    （翻譯為德文）
├─ pdf-fr    （翻譯為法文）
└─ ...
```

### 環境變數

| 變數                           | 說明           | 預設值                   |
| ------------------------------ | -------------- | ------------------------ |
| `PDFMATHTRANSLATE_SERVICE`     | 翻譯服務提供商 | google                   |
| `PDFMATHTRANSLATE_MODELS_PATH` | 模型路徑       | /models/pdfmathtranslate |

### 注意事項

- 所需模型已在 Docker build 階段預先下載
- 不會在 runtime 隱式下載任何模型
- 使用 Google 翻譯為預設服務（免費），可透過環境變數切換

---

## 檔案傳輸機制

Contents.CN 使用統一的檔案傳輸策略：

| 檔案大小 | 傳輸方式 | 說明                     |
| -------- | -------- | ------------------------ |
| ≤ 10MB   | 直接傳輸 | 單一請求完成上傳/下載    |
| > 10MB   | 分段傳輸 | 使用 5MB chunks 分段傳輸 |

### 多檔輸出封裝

- ✅ 唯一允許格式：`.tar`
- ❌ 禁止使用：`.tar.gz`、`.tgz`、`.zip`

### 設計原則

- 分段傳輸僅存在於傳輸層
- 轉換引擎只接收完整檔案
- 前後端使用共用傳輸模組

---

## 語言支援

支援 **65 種語言**，包含繁體中文、簡體中文、英文、日文、韓文等。

語言會根據瀏覽器設定自動偵測，也可透過右上角選單手動切換。

詳細說明 → [docs/i18n.md](docs/i18n.md)

---

## 版本與更新

```bash
docker compose down
docker compose pull
docker compose up -d
```

- 版本說明 → [docs/versions/](docs/versions/)
- 更新指南 → [docs/deployment/update.md](docs/deployment/update.md)
- Changelog → [CHANGELOG.md](CHANGELOG.md)

---

## API Server（選用）

如需以程式整合方式使用 ConvertX 的轉檔功能，可啟用 **API Server**。

> ⚠️ API Server 為**選用功能**，不影響現有 Web UI 的使用。若只使用網頁介面，無需任何額外設定。

### 功能特點

- 🔐 **JWT 認證** — 安全的 API 存取控制
- 🌐 **REST + GraphQL** — 雙協議支援，滿足不同整合需求
- 🔍 **智慧建議** — 轉換失敗時自動推薦替代引擎
- 🛠️ **20+ 轉換引擎** — 與 Web UI 共用完整轉換器套件

### 快速啟用

```bash
# 同時啟動 Web UI 與 API Server
docker compose --profile api up -d
```

| 服務       | 端口 | 說明           |
| ---------- | ---- | -------------- |
| Web UI     | 3000 | 網頁介面       |
| API Server | 3001 | REST & GraphQL |

### API 文件

詳細的 API 規格與使用說明：

- 📘 [API Server README](api-server/README.md)
- 📗 [API 規格文件](api-server/docs/API_SPEC.md)
- 📙 [架構說明](api-server/docs/ARCHITECTURE.md)

---

## 進階文件

| 文件                                   | 說明                      |
| -------------------------------------- | ------------------------- |
| [環境變數](docs/config/environment.md) | 所有可用參數              |
| [安全性設定](docs/config/security.md)  | HTTP_ALLOWED、TRUST_PROXY |
| [反向代理](docs/deployment.md)         | Nginx / Traefik / Caddy   |
| [Docker 進階](docs/docker.md)          | 自訂 Build                |
| [FAQ](docs/faq.md)                     | 疑難排解                  |

---

## 預覽

![ConvertX-CN Preview](images/preview.png)

---

## License

[MIT](LICENSE) | 基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX)
