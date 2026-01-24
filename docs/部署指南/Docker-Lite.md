# ConvertX-CN Lite 版

ConvertX-CN Lite 是專為一般使用者設計的輕量版本，提供快速部署與較小的 Docker Image 體積。

---

## 📦 版本對照表

ConvertX-CN 提供三種 Docker Image 版本：

| 版本    | Image Tag                  | 大小                                                                                                                                 | 適用場景                |
| ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| 一般版  | `latest`                   | ![Docker Image Size](https://img.shields.io/docker/image-size/convertx/convertx-cn/latest?label=image%20size%20)                     | 進階使用者、AI/OCR/翻譯 |
| 擴充版  | 自行建構 `Dockerfile.full` | >10 GB                                                                                                                               | 65 種 OCR 語言          |
| Lite 版 | `latest-lite`              | ![Docker Image Size (Lite)](<https://img.shields.io/docker/image-size/convertx/convertx-cn/latest-lite?label=image%20size%20(lite)>) | 一般使用者、基本轉檔    |

---

## 📦 什麼是 Lite 版？

| 特性           | 一般版                                                                                                           | Lite 版                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Image 大小** | ![Docker Image Size](https://img.shields.io/docker/image-size/convertx/convertx-cn/latest?label=image%20size%20) | ![Docker Image Size (Lite)](<https://img.shields.io/docker/image-size/convertx/convertx-cn/latest-lite?label=image%20size%20(lite)>) |
| **部署時間**   | 較長（含預下載 AI 模型）                                                                                         | 快速                                                                                                                                 |
| **記憶體需求** | 較高（AI 模型）                                                                                                  | 較低                                                                                                                                 |
| **適用場景**   | 進階使用者、需要 AI/OCR/翻譯                                                                                     | 一般使用者、基本轉檔需求                                                                                                             |
| **開箱即用**   | ✅ 所有模型已預下載                                                                                              | ✅ 無需下載                                                                                                                          |

> 💡 **一般版開箱即用說明**：
>
> - 所有 AI 模型在 Docker build 階段已預下載
> - Runtime 完全離線運行，不依賴網路下載模型
> - 僅翻譯 API（Google/Bing/DeepL）需要網路連接

---

## ✅ Lite 版包含的功能

### 核心功能

- ✅ **多語言 UI**：完整 i18n 介面（65 種語言）
- ✅ **檔案上傳/轉檔/下載**：完整流程支援
- ✅ **轉檔進度與錯誤提示**

### 轉換引擎

| 引擎               | 功能說明           | 支援格式                                     |
| ------------------ | ------------------ | -------------------------------------------- |
| **LibreOffice**    | 文件轉檔           | DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, PDF... |
| **GraphicsMagick** | 圖片轉檔           | PNG, JPG, GIF, WEBP, BMP, TIFF...            |
| **FFmpeg**         | 影音轉檔（精簡版） | MP4, MP3, WAV, AVI, MKV, MOV...              |
| **Pandoc**         | 文件格式轉換       | Markdown, HTML, DOCX, LaTeX, EPUB...         |

### PDF 功能

| 功能             | 說明                                            |
| ---------------- | ----------------------------------------------- |
| **PDF/A 轉換**   | 使用 Ghostscript 轉換為 PDF/A-1b、PDF/A-2b      |
| **PDF 防修改**   | 使用 qpdf 設定權限保護                          |
| **PDF 數位簽章** | 使用 PFX/PKCS#12 憑證簽章（單一簽章，不含 LTV） |

---

## ❌ Lite 版未包含的功能

以下功能僅在一般版中提供：

| 功能類別            | 功能說明                       |
| ------------------- | ------------------------------ |
| **向量圖轉換**      | Inkscape（SVG, PDF, PNG, EPS） |
| **高效能圖片**      | VIPS（大型圖片處理）           |
| **OCR**             | Tesseract OCR 文字辨識         |
| **PDF 翻譯**        | PDFMathTranslate、BabelDOC     |
| **PDF 轉 Markdown** | MinerU 智能擷取                |
| **AI 模型**         | YOLO、VLM 等深度學習模型       |
| **電子書**          | Calibre（ePub、MOBI 轉換）     |
| **CAD/3D**          | assimp、OpenCascade            |
| **PDF/A 驗證**      | veraPDF                        |
| **長期驗證**        | LTV、OCSP、CRL、TSA            |
| **完整 TexLive**    | 進階 LaTeX 排版                |

> ⚠️ **重要提醒**：一般版的 AI/OCR/翻譯功能已預下載所有模型，開箱即用，Runtime 不會從網路下載任何模型。

---

## 🚀 快速開始

### Docker Run

```bash
docker run -d \
  --name convertx-cn-lite \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=你的隨機字串至少32字元 \
  convertx/convertx-cn:latest-lite
```

### Docker Compose

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest-lite
    container_name: convertx-cn-lite
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=你的隨機字串至少32字元
```

```bash
docker compose up -d
```

---

## 🏷️ Image Tag 說明

| Tag                                | 說明              |
| ---------------------------------- | ----------------- |
| `convertx/convertx-cn:latest`      | 一般版最新穩定版  |
| `convertx/convertx-cn:latest-lite` | Lite 版最新穩定版 |
| `convertx/convertx-cn:0.1.16`      | 一般版指定版本    |
| `convertx/convertx-cn:0.1.16-lite` | Lite 版指定版本   |

> 💡 **版本標記說明**：
>
> - **一般版**：無後綴，包含所有 AI/OCR/翻譯功能，開箱即用（約 8-12 GB）
> - **擴充版**：使用 `Dockerfile.full` 自行建構，支援 65 種 OCR 語言（>10 GB）
> - **Lite 版**：帶 `-lite` 後綴，輕量化設計，適合基本轉檔需求（約 1.2 GB）

---

## 🔧 自行擴充 Lite 版功能

如果您使用 Lite 版但需要部分進階功能，可以透過 Docker Compose 擴充。

### 方法 1：使用 Docker Compose Override

建立 `docker-compose.override.yml`：

```yaml
# docker-compose.override.yml
# 在 Lite 版基礎上擴充功能

services:
  convertx:
    # 使用自定義 Dockerfile 擴充
    build:
      context: .
      dockerfile: Dockerfile.lite.custom
```

建立 `Dockerfile.lite.custom`：

```dockerfile
# Dockerfile.lite.custom
# 基於 Lite 版擴充

FROM convertx/convertx-cn:latest-lite

# 範例：新增 Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-chi-tra \
  && rm -rf /var/lib/apt/lists/*

# 範例：新增 Calibre
# RUN apt-get update && apt-get install -y --no-install-recommends \
#   calibre \
#   && rm -rf /var/lib/apt/lists/*
```

### 方法 2：直接使用一般版

如果需要完整功能，建議直接使用一般版：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest # 一般版（開箱即用）
```

### ⚠️ 重要提醒

- Lite 版**本身不包含** OCR、AI、翻譯等進階功能
- 自行擴充會增加 Image 大小與維護成本
- 如需完整功能，建議直接使用一般版（所有模型已預下載）

---

## 📊 Lite vs 一般版功能對照表

| 功能類別  | 功能                         | Lite | 一般版 |
| --------- | ---------------------------- | :--: | :----: |
| **UI**    | 多語言介面（65 語言）        |  ✅  |   ✅   |
| **UI**    | 深色/淺色主題                |  ✅  |   ✅   |
| **轉檔**  | 文件轉檔（LibreOffice）      |  ✅  |   ✅   |
| **轉檔**  | 圖片轉檔（GraphicsMagick）   |  ✅  |   ✅   |
| **轉檔**  | 圖片轉檔（ImageMagick）      |  ❌  |   ✅   |
| **轉檔**  | 影音轉檔（FFmpeg）           |  ✅  |   ✅   |
| **轉檔**  | 文件格式（Pandoc）           |  ✅  |   ✅   |
| **轉檔**  | 向量圖（Inkscape）           |  ❌  |   ✅   |
| **轉檔**  | 高效能圖片（VIPS）           |  ❌  |   ✅   |
| **轉檔**  | 電子書（Calibre）            |  ❌  |   ✅   |
| **轉檔**  | CAD/3D（assimp）             |  ❌  |   ✅   |
| **PDF**   | PDF/A 轉換                   |  ✅  |   ✅   |
| **PDF**   | PDF 防修改                   |  ✅  |   ✅   |
| **PDF**   | PDF 數位簽章                 |  ✅  |   ✅   |
| **PDF**   | PDF/A 驗證（veraPDF）        |  ❌  |   ✅   |
| **PDF**   | 長期驗證（LTV）              |  ❌  |   ✅   |
| **OCR**   | 文字辨識（Tesseract）        |  ❌  |   ✅   |
| **OCR**   | ocrmypdf                     |  ❌  |   ✅   |
| **AI**    | PDF 翻譯（PDFMathTranslate） |  ❌  |   ✅   |
| **AI**    | PDF 翻譯（BabelDOC）         |  ❌  |   ✅   |
| **AI**    | PDF 轉 Markdown（MinerU）    |  ❌  |   ✅   |
| **字型**  | 基本 CJK 字型                |  ✅  |   ✅   |
| **字型**  | 完整 Noto 字型集             |  ❌  |   ✅   |
| **LaTeX** | 基本 LaTeX                   |  ❌  |   ✅   |
| **LaTeX** | 完整 TexLive CJK             |  ❌  |   ✅   |

---

## 💡 選擇建議

### 適合使用 Lite 版的情境

- 🔹 僅需要基本的文件/圖片/影音轉檔
- 🔹 伺服器資源有限（VPS、NAS）
- 🔹 需要快速部署
- 🔹 不需要 OCR、AI、翻譯功能

### 適合使用一般版的情境

- 🔹 需要 OCR 文字辨識
- 🔹 需要 PDF 翻譯功能
- 🔹 需要 MinerU PDF 轉 Markdown
- 🔹 需要電子書轉換（ePub、MOBI）
- 🔹 需要 CAD/3D 檔案處理
- 🔹 需要進階 PDF/A 驗證
- 🔹 需要開箱即用的離線 AI 功能

---

## 📝 版本更新

Lite 版與一般版使用相同的版本號規則，但 tag 不同：

```bash
# 更新 Lite 版
docker compose pull
docker compose up -d

# 或指定版本
docker pull convertx/convertx-cn:0.1.16-lite
```

---

## 🔗 相關連結

- [Docker Hub](https://hub.docker.com/r/convertx/convertx-cn)
- [GitHub Repository](https://github.com/pi-docket/ConvertX-CN)
- [一般版部署指南](Docker.md)
- [環境變數說明](../配置設定/環境變數.md)
