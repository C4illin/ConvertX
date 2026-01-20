# Docker 配置指南

## Docker Image 版本說明

ConvertX-CN 提供兩種 Docker Image 選項：

### 1. 官方 Image（推薦）

從 Docker Hub 拉取的預建 Image，適合大多數使用者。

| Tag                           | 說明       |
| ----------------------------- | ---------- |
| `convertx/convertx-cn:latest` | 最新穩定版 |
| `convertx/convertx-cn:v0.1.9` | 指定版本號 |

**內建功能：**

- ✅ 核心轉換工具（FFmpeg、LibreOffice、ImageMagick 等）
- ✅ OCR 支援：英文、繁/簡中文、日文、韓文、德文、法文
- ✅ 字型：Noto CJK、Liberation、自訂中文字型
- ✅ TexLive 最小集合（支援 CJK/德/法）

**Image 大小：約 4-6 GB**

### 2. 完整版（自行 Build）

使用 `Dockerfile.full` 自行建構，適合需要：

- 65 種 OCR 語言
- 完整 TexLive
- 額外字型套件

**⚠️ 注意事項：**

- Image 大小可能超過 **10GB**
- Build 時間約 **30-60 分鐘**
- 需要自行維護更新

```bash
# 自行建構完整版
docker build -f Dockerfile.full -t convertx-cn-full .
```

---

## 自訂 Build 指南（進階使用者）

如果官方 Image 不符合需求，可以使用 `Dockerfile.full` 自行建構：

### 步驟

1. **複製 Dockerfile.full**

   ```bash
   cp Dockerfile.full Dockerfile.custom
   ```

2. **取消註解需要的功能**
   - 編輯 `Dockerfile.custom`
   - 找到需要的功能區塊
   - 移除 `#` 註解符號

3. **建構 Image**
   ```bash
   docker build -f Dockerfile.custom -t convertx-cn-custom .
   ```

### 可選功能

| 功能            | 預估大小 | 說明             |
| --------------- | -------- | ---------------- |
| 完整 TexLive    | +3GB     | 完整 LaTeX 支援  |
| 全部 OCR 語言   | +2GB     | 65 種語言辨識    |
| Noto Extra 字型 | +500MB   | 全球語言字型     |
| 歐洲 OCR 語言   | +200MB   | 25 種歐洲語言    |
| 中東/南亞 OCR   | +150MB   | 阿拉伯、印度語系 |
| 東南亞 OCR      | +100MB   | 泰、越、印尼等   |

### 範例：僅加入西班牙文 OCR

```dockerfile
# 在 Dockerfile.full 中取消以下註解：
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr-spa \
  && rm -rf /var/lib/apt/lists/*
```

---

## Docker Run

基本啟動命令：

```bash
docker run -d \
  --name convertx-cn \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e ACCOUNT_REGISTRATION=true \
  convertx/convertx-cn:latest
```

### 參數說明

| 參數                  | 說明       |
| --------------------- | ---------- |
| `-d`                  | 背景執行   |
| `--name convertx-cn`  | 容器名稱   |
| `-p 3000:3000`        | 連接埠映射 |
| `-v ./data:/app/data` | 資料持久化 |
| `-e TZ=Asia/Taipei`   | 時區設定   |

---

## Docker Compose

### 基本配置

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
      - JWT_SECRET=your-very-long-random-secret-key
      - ACCOUNT_REGISTRATION=true
```

### 生產環境配置

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
      - JWT_SECRET=${JWT_SECRET}
      - ACCOUNT_REGISTRATION=false
      - HTTP_ALLOWED=false
      - AUTO_DELETE_EVERY_N_HOURS=24
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### 使用 Traefik 反向代理

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    container_name: convertx-cn
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=${JWT_SECRET}
      - ACCOUNT_REGISTRATION=false
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.convertx.rule=Host(`convert.example.com`)"
      - "traefik.http.routers.convertx.entrypoints=websecure"
      - "traefik.http.routers.convertx.tls.certresolver=letsencrypt"
      - "traefik.http.services.convertx.loadbalancer.server.port=3000"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

---

## 資料持久化

### Volume 結構

```
./data/
├── uploads/     # 上傳的原始檔案
├── output/      # 轉換後的檔案
└── convertx.db  # SQLite 資料庫
```

### 備份

```bash
# 備份資料
docker cp convertx-cn:/app/data ./backup-$(date +%Y%m%d)

# 還原資料
docker cp ./backup-20240101/. convertx-cn:/app/data/
```

---

## 更新

### Docker Compose

```bash
docker compose pull
docker compose up -d
```

### Docker Run

```bash
docker pull convertx/convertx-cn:latest
docker stop convertx-cn
docker rm convertx-cn
docker run -d ... # 使用原本的參數
```

---

## 健康檢查

ConvertX-CN 提供健康檢查端點：

```bash
curl http://localhost:3000/healthcheck
```

可在 Docker Compose 中配置：

```yaml
services:
  convertx:
    # ...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 故障排除

### 記憶體不足

如果遇到 OOM（記憶體不足），請增加容器記憶體限制：

```yaml
deploy:
  resources:
    limits:
      memory: 8G
```

### 連接埠衝突

如果 3000 埠被占用，可更改映射：

```bash
-p 8080:3000  # 使用 8080 埠
```

### 權限問題

確保 data 目錄有正確權限：

```bash
chmod -R 777 ./data
```
