![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務** | **Self-hosted File Converter - Full Edition**

[![Docker](https://github.com/pi-docket/ConvertX-CN/actions/workflows/release.yml/badge.svg)](https://github.com/pi-docket/ConvertX-CN/actions/workflows/release.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker&label=Docker%20Hub)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)
[![License](https://img.shields.io/github/license/pi-docket/ConvertX-CN)](LICENSE)

---

## ✨ 什麼是 ConvertX-CN？

ConvertX-CN 是基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX) 的**完整版 Fork**，專為中文使用者優化，並預載所有轉換依賴。

> 🎉 **一鍵部署，無需額外配置**  
> 使用者 **不需要自己寫 Dockerfile**，直接 `docker run` 或 `docker compose up` 即可使用。

### 主要特色

| 特色 | 說明 |
|------|------|
| 🌍 **65+ 語言支援** | 繁體中文、簡體中文、英文、日文、韓文等 65 種語言 |
| 📦 **完整內建** | LibreOffice、FFmpeg、Pandoc、Calibre 等 20+ 轉換器 |
| 🎨 **CJK 字型** | Noto CJK、微軟核心字型、標楷體等中日韓字型 |
| 🔤 **OCR 支援** | Tesseract + 多語言語言包 |
| ⚡ **LaTeX 完整版** | TexLive Full，支援所有 LaTeX 需求 |
| 🐳 **開箱即用** | 一個 Docker 命令即可啟動 |

---

## 🚀 快速開始

### 最快方式：Docker Run

```bash
docker run -d \
  --name convertx-cn \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e ACCOUNT_REGISTRATION=true \
  convertx/convertx-cn:latest
```

開啟瀏覽器訪問 `http://localhost:3000`，建立帳號即可開始使用！

### 推薦方式：Docker Compose

建立 `docker-compose.yml`：

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
      - JWT_SECRET=your-secret-key-change-me
      - ACCOUNT_REGISTRATION=true
```

```bash
docker compose up -d
```

📖 完整部署指南請見 → [docs/getting-started.md](docs/getting-started.md)

---

## 🌍 語言支援

ConvertX-CN 支援 **65 種語言**，包括：

| 區域 | 語言 |
|------|------|
| **東亞** | 繁體中文（預設）、简体中文、日本語、한국어 |
| **歐洲** | English, Deutsch, Français, Español, Italiano, Português, Русский, Polski, Nederlands, Українська, Čeština, Svenska, Dansk, Suomi, Norsk, Ελληνικά, Magyar, Română, Български, Hrvatski, Slovenčina, Slovenščina, Lietuvių, Latviešu, Eesti, Српски, Català, Euskara, Galego, Íslenska, Gaeilge, Cymraeg, Malti, Македонски, Shqip |
| **中東/南亞** | العربية, עברית, فارسی, Türkçe, हिन्दी, বাংলা, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം, नेपाली, සිංහල |
| **東南亞** | ไทย, Tiếng Việt, Bahasa Indonesia, Bahasa Melayu, Filipino, မြန်မာ, ខ្មែរ, ລາວ |
| **非洲** | Afrikaans, Kiswahili, አማርኛ, isiZulu |

語言會根據瀏覽器設定自動偵測，也可透過右上角選單手動切換。

---

## 📦 內建轉換器

| 轉換器 | 用途 | 輸入格式 | 輸出格式 |
|--------|------|----------|----------|
| FFmpeg | 影音 | ~472 | ~199 |
| ImageMagick | 圖片 | 245 | 183 |
| GraphicsMagick | 圖片 | 167 | 130 |
| LibreOffice | 文件 | 41 | 22 |
| Pandoc | 文件 | 43 | 65 |
| Calibre | 電子書 | 26 | 19 |
| Inkscape | 向量圖 | 7 | 17 |
| Assimp | 3D 模型 | 77 | 23 |

完整列表 → [docs/converters.md](docs/converters.md)

---

## 📖 文件導覽

| 文件 | 說明 |
|------|------|
| [🚀 快速開始](docs/getting-started.md) | Docker 部署教學 |
| [🐳 Docker 配置](docs/docker.md) | 完整 Docker 設定指南 |
| [⚙️ 環境變數](docs/environment-variables.md) | 所有環境變數說明 |
| [💾 儲存與 URL](docs/url-id-and-storage.md) | 檔案儲存機制說明 |
| [🔧 進階用法](docs/advanced-usage.md) | 硬體加速、反向代理等 |
| [🌍 多語言](docs/i18n.md) | i18n 語言設定與新增 |
| [📦 轉換器列表](docs/converters.md) | 支援的轉換格式完整列表 |

---

## 🐳 Docker Image

| Tag | 說明 |
|-----|------|
| `convertx/convertx-cn:latest` | 最新穩定版 |
| `convertx/convertx-cn:v0.1.3` | 指定版本 |

> ⚠️ 由於內建完整依賴，Image 約 4-6 GB，首次下載需較長時間。

---

## 📸 預覽

![ConvertX-CN Preview](images/preview.png)

---

## 🛠️ 開發

```bash
# 安裝依賴
bun install

# 開發模式
bun run dev

# 建構
bun run build
```

歡迎 Pull Request！請使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

---

## 🙏 致謝

本專案基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX) 開發。

<a href="https://github.com/C4illin/ConvertX/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=C4illin/ConvertX" alt="Contributors" />
</a>

---

## 📜 License

[MIT License](LICENSE)

---

<p align="center">
  <b>Powered by ConvertX-CN</b><br>
  <a href="https://github.com/pi-docket/ConvertX-CN">https://github.com/pi-docket/ConvertX-CN</a>
</p>
