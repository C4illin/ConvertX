# ConvertX-CN Dockerfile 重構說明

## 版本：v0.1.17

此次重構完全重新設計了 Docker 建構流程，以達成以下目標：

1. **完全離線運行**：所有模型、字型在 build 階段下載完成
2. **Multi-Arch 支援**：同時支援 linux/amd64 和 linux/arm64
3. **可維護性**：每個安裝步驟拆分為獨立 RUN
4. **可追蹤性**：每個 stage 職責明確

---

## 🏗️ Multi-Stage Build 結構

| Stage | 名稱 | RUN 數量 | 說明 |
|-------|------|----------|------|
| 1 | `base` | 3 | Bun runtime 基礎環境 |
| 2 | `install` | 4 | Node.js 依賴安裝 |
| 3 | `prerelease` | 1 | 應用程式建構 |
| 4 | `system-tools` | 14 | APT 系統工具 |
| 5 | `fonts` | 4 | 系統字型 + 自訂字型 |
| 6 | `python-tools` | 9 | Python CLI 工具 |
| 7 | `models` | 7 | AI 模型下載 |
| 8 | `release` | 多個 | 最終 Image |

---

## 📦 各 Stage 安裝內容

### Stage 4: system-tools（14 個獨立 RUN）

| RUN | 內容 |
|-----|------|
| 4.1 | APT 配置 |
| 4.2 | 基礎系統工具（curl, git, etc.） |
| 4.3 | 核心轉換工具（ghostscript, graphicsmagick, etc.） |
| 4.4 | dasel |
| 4.5 | resvg（僅 AMD64） |
| 4.6 | deark（編譯安裝） |
| 4.7 | vtracer |
| 4.8 | FFmpeg |
| 4.9 | 圖像處理工具（ImageMagick, Inkscape, vips） |
| 4.10 | 文件處理工具（Calibre, Pandoc） |
| 4.11 | LibreOffice |
| 4.12 | TexLive 基礎 |
| 4.13 | TexLive 語言包 |
| 4.14 | Tesseract OCR |

### Stage 5: fonts（4 個獨立 RUN）

| RUN | 內容 |
|-----|------|
| 5.1 | 系統字型（Noto CJK, Liberation 等） |
| 5.2 | 複製自訂字型 |
| 5.3 | 設定 BabelDOC 字型目錄 |
| 5.4 | 更新字型快取 |

### Stage 6: python-tools（9 個獨立 RUN）

| RUN | 內容 |
|-----|------|
| 6.1 | Python 基礎環境 |
| 6.2 | uv 套件管理器 |
| 6.3 | huggingface_hub |
| 6.4 | endesive（PDF 簽章） |
| 6.5 | markitdown |
| 6.6 | pdf2zh（PDFMathTranslate） |
| 6.7 | babeldoc |
| 6.8 | MinerU（僅 AMD64） |
| 6.9 | tiktoken |

### Stage 7: models（7 個獨立 RUN）

| RUN | 內容 |
|-----|------|
| 7.1 | 創建目錄結構 |
| 7.2 | 複製預下載的 ONNX 模型 |
| 7.3 | 下載 MinerU Pipeline 模型（僅 AMD64） |
| 7.4 | 產生 MinerU 配置檔 |
| 7.5 | BabelDOC warmup |
| 7.6 | 下載 tiktoken 編碼 |
| 7.7 | 清理下載快取 |

---

## 📁 模型目錄結構

```
/opt/convertx/
├── models/
│   └── mineru/
│       └── PDF-Extract-Kit-1.0/
└── mineru.json

/root/.cache/babeldoc/
├── models/
│   └── doclayout_yolo_docstructbench_imgsz1024.onnx
├── fonts/
├── cmap/
└── tiktoken/
```

---

## 🌍 Multi-Arch 處理

### AMD64（完整功能）

所有工具和模型都必須正確安裝，任何失敗都會導致 build 失敗。

### ARM64（安全降級）

以下功能會被跳過，但 build 不會失敗：

| 工具/模型 | 原因 | Log 訊息 |
|-----------|------|----------|
| resvg | 無 ARM64 預編譯版本 | `⚠️ resvg 無 ARM64 版本，跳過` |
| MinerU | 依賴僅支援 x86_64 | `⚠️ ARM64：MinerU 不支援，跳過安裝` |
| MinerU 模型 | 跟隨 MinerU | `⚠️ ARM64：跳過 MinerU 模型下載` |

---

## 🔒 離線模式環境變數

```bash
# HuggingFace 完全離線
HF_HOME="/nonexistent"
HF_HUB_OFFLINE="1"
TRANSFORMERS_OFFLINE="1"
HF_DATASETS_OFFLINE="1"

# MinerU 強制本地模型
MINERU_MODEL_SOURCE="local"
MINERU_CONFIG="/root/mineru.json"
MINERU_MODELS_DIR="/opt/convertx/models/mineru"

# BabelDOC 離線模式
BABELDOC_OFFLINE="1"
BABELDOC_CACHE_PATH="/root/.cache/babeldoc"

# 禁止 pip 安裝
PIP_NO_INDEX="1"
```

---

## 🔧 Build 指令

### 單架構 build（本機測試）
```bash
docker build -t convertx-cn:latest .
```

### Multi-arch build（推送到 Docker Hub）
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag convertx/convertx-cn:latest \
  --push .
```

---

## 📊 預估 Image 大小

| 架構 | 大小 |
|------|------|
| AMD64 | 10-14 GB |
| ARM64 | 6-8 GB（無 MinerU 模型）|

---

## ✅ 驗證方式

### Build 時驗證
Dockerfile 最後階段會自動執行驗證，失敗會中止 build。

### Runtime 驗證
```bash
docker exec <container> /app/scripts/verify-models.sh
docker exec <container> /app/scripts/verify-installation.sh
```
