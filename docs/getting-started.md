# 快速開始

## 系統需求

- Docker 20.10+
- Docker Compose v2+（推薦）
- 至少 4GB RAM（建議 8GB）
- 10GB 磁碟空間（用於 Docker image）

## 安裝方式

### 方法一：Docker Run

```bash
docker run -d \
  --name convertx-cn \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  convertx/convertx-cn:latest
```

### 方法二：Docker Compose（推薦）

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
      - JWT_SECRET=請更換為一個長且隨機的字串
      - ACCOUNT_REGISTRATION=false
      - HTTP_ALLOWED=false
      - AUTO_DELETE_EVERY_N_HOURS=24
```

啟動服務：

```bash
docker compose up -d
```

## 首次設定

1. 開啟瀏覽器訪問 `http://localhost:3000`
2. 建立第一個帳號（此帳號即為管理員）
3. 登入後即可開始使用

## 更新版本

```bash
docker compose pull
docker compose up -d
```

## 下一步

- 查看 [環境變數設定](./configuration.md)
- 瞭解 [支援的轉換器](./converters.md)
- 閱讀 [多語言設定](./i18n.md)
