# Docker 部署指南

本文件說明如何使用 Docker 部署 ConvertX-CN。

> 💡 **Lite 版**：如果您只需要基本轉檔功能，可以使用 [Lite 版](Docker-Lite.md)，Image 體積更小、部署更快。

---

## Docker Image 版本

### 官方預建版（推薦）

| Tag                                | 說明              |
| ---------------------------------- | ----------------- |
| `convertx/convertx-cn:latest`      | Full 版最新穩定版 |
| `convertx/convertx-cn:latest-lite` | Lite 版最新穩定版 |
| `convertx/convertx-cn:v0.1.x`      | Full 版指定版本號 |
| `convertx/convertx-cn:v0.1.x-lite` | Lite 版指定版本號 |

### Full 版（預設）

**Image 大小：約 8-12 GB**

**內建功能：**

- ✅ 核心轉換工具（FFmpeg、LibreOffice、ImageMagick 等）
- ✅ OCR 支援：英文、繁/簡中文、日文、韓文、德文、法文
- ✅ PDF 翻譯：PDFMathTranslate、BabelDOC
- ✅ PDF 轉 Markdown：MinerU
- ✅ 字型：Noto CJK、Liberation、自訂中文字型
- ✅ TexLive（支援 CJK/德/法）

### Lite 版（輕量版）

**Image 大小：約 1.5-2.5 GB**

**內建功能：**

- ✅ 核心轉換工具（FFmpeg、LibreOffice、GraphicsMagick）
- ✅ 文件轉換（Pandoc）
- ✅ PDF/A 轉換、PDF 防修改、PDF 數位簽章
- ✅ 基本 CJK 字型
- ❌ 不含 OCR、AI 翻譯、MinerU、Calibre

> 📖 Lite 版詳細說明請參閱 [Lite 版部署指南](Docker-Lite.md)

### 完整版（自行 Build）

使用 `Dockerfile.full` 自行建構，適合需要：

- 65 種 OCR 語言
- 完整 TexLive
- 額外字型套件

```bash
docker build -f Dockerfile.full -t convertx-cn-full .
```

> ⚠️ 注意：Image 大小可能超過 **10GB**，Build 時間約 **30-60 分鐘**

---

## Docker Run

### 基本啟動

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=你的隨機字串至少32字元 \
  convertx/convertx-cn:latest
```

### 參數說明

| 參數                       | 說明       |
| -------------------------- | ---------- |
| `-d`                       | 背景執行   |
| `--name convertx-cn`       | 容器名稱   |
| `--restart unless-stopped` | 自動重啟   |
| `-p 3000:3000`             | 連接埠映射 |
| `-v ./data:/app/data`      | 資料持久化 |
| `-e TZ=Asia/Taipei`        | 時區設定   |

### 進階選項

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=你的隨機字串 \
  -e ACCOUNT_REGISTRATION=false \
  -e HTTP_ALLOWED=true \
  -e AUTO_DELETE_EVERY_N_HOURS=24 \
  convertx/convertx-cn:latest
```

---

## 資料持久化

### Volume 結構

```
./data/
├── convertx.db  # SQLite 資料庫
├── uploads/     # 上傳的原始檔案
└── output/      # 轉換後的檔案
```

### 建立資料夾

**重要**：請務必先建立資料夾，否則 Docker 會建立匿名 volume。

**Linux / macOS：**

```bash
mkdir -p ~/convertx-cn/data
```

**Windows PowerShell：**

```powershell
mkdir C:\convertx-cn\data
```

### 備份與還原

**備份：**

```bash
tar -czvf convertx-backup-$(date +%Y%m%d).tar.gz ./data
```

**還原：**

```bash
tar -xzvf convertx-backup-20260120.tar.gz
```

---

## 硬體加速

### NVIDIA GPU (CUDA/NVENC)

1. 安裝 [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

2. Docker Compose 配置：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    environment:
      - FFMPEG_ARGS=-hwaccel cuda -hwaccel_output_format cuda
      - FFMPEG_OUTPUT_ARGS=-c:v h264_nvenc -preset fast
```

### Intel Quick Sync Video (QSV)

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    devices:
      - /dev/dri:/dev/dri
    environment:
      - FFMPEG_ARGS=-hwaccel qsv
      - FFMPEG_OUTPUT_ARGS=-c:v h264_qsv -preset faster
```

### AMD VAAPI

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    devices:
      - /dev/dri:/dev/dri
    environment:
      - FFMPEG_ARGS=-hwaccel vaapi -hwaccel_device /dev/dri/renderD128
      - FFMPEG_OUTPUT_ARGS=-c:v h264_vaapi
```

---

## 資源限制

### 記憶體限制

```yaml
services:
  convertx:
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### CPU 限制

```yaml
services:
  convertx:
    deploy:
      resources:
        limits:
          cpus: "2"
```

---

## 版本更新

**1. 拉取最新版本：**

```bash
docker pull convertx/convertx-cn:latest
```

**2. 停止並移除舊容器：**

```bash
docker stop convertx-cn
docker rm convertx-cn
```

**3. 重新啟動（使用相同的參數）：**

```bash
docker run -d --name convertx-cn ...
```

或使用 Docker Compose：

```bash
docker compose pull
docker compose up -d
```

---

## 疑難排解

### 查看日誌

```bash
docker logs convertx-cn
```

持續追蹤日誌：

```bash
docker logs -f convertx-cn
```

### 進入容器

```bash
docker exec -it convertx-cn /bin/bash
```

### 常見問題

| 問題        | 解決方法                       |
| ----------- | ------------------------------ |
| 啟動失敗    | 檢查日誌 `docker logs`         |
| Port 被占用 | 改用其他 port `-p 8080:3000`   |
| 權限錯誤    | `chmod -R 777 ./data`          |
| 記憶體不足  | 增加記憶體限制或減少同時轉換數 |

---

## 相關文件

- [Docker Compose 詳解](Docker組合.md)
- [反向代理設定](反向代理.md)
- [環境變數設定](../配置設定/環境變數.md)
