# Docker 配置指南

## Docker Image

ConvertX-CN 提供預建的 Docker Image，包含所有轉換依賴。

### 可用 Tag

| Tag | 說明 |
|-----|------|
| `convertx/convertx-cn:latest` | 最新穩定版 |
| `convertx/convertx-cn:v0.1.3` | 指定版本號 |
| `convertx/convertx-cn:v0.1.3-FULL` | 完整版（與 latest 相同） |

### Image 大小

由於內建完整依賴（LibreOffice、TexLive、FFmpeg 等），Image 約 **4-6 GB**。

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

| 參數 | 說明 |
|------|------|
| `-d` | 背景執行 |
| `--name convertx-cn` | 容器名稱 |
| `-p 3000:3000` | 連接埠映射 |
| `-v ./data:/app/data` | 資料持久化 |
| `-e TZ=Asia/Taipei` | 時區設定 |

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
