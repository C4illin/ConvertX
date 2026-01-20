# Docker Compose 詳解

本文件說明 docker-compose.yml 的完整設定選項。

---

## 基本結構

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
      - JWT_SECRET=your-secret-key
```

---

## 映像檔選擇

```yaml
image: convertx/convertx-cn:latest   # 最新穩定版
image: convertx/convertx-cn:v0.1.9   # 指定版本
```

- `latest`：自動獲取最新版本，適合測試環境
- 指定版本：適合生產環境，避免意外升級

詳見 [版本選擇指南](../versions/)。

---

## 連接埠設定

```yaml
ports:
  - "3000:3000" # 主機埠:容器埠
  - "8080:3000" # 使用 8080 埠
  - "127.0.0.1:3000:3000" # 僅本地存取
```

| 設定                    | 說明                 |
| ----------------------- | -------------------- |
| `"3000:3000"`           | 所有網路介面可存取   |
| `"127.0.0.1:3000:3000"` | 僅本機可存取         |
| `"8080:3000"`           | 使用 8080 埠對外開放 |

---

## 資料儲存

### 使用資料夾掛載（推薦）

```yaml
volumes:
  - ./data:/app/data
```

- 資料存在主機上的 `./data` 資料夾
- 方便備份、遷移、直接存取

### 使用 Docker Volume

```yaml
volumes:
  - convertx_data:/app/data

volumes:
  convertx_data:
```

- 資料由 Docker 管理
- 備份需透過 Docker 指令

---

## 環境變數

### 必要設定

```yaml
environment:
  - JWT_SECRET=your-secret-key-at-least-32-chars
```

### 建議設定

```yaml
environment:
  - TZ=Asia/Taipei
  - HTTP_ALLOWED=true # 本地測試
  - ACCOUNT_REGISTRATION=true
```

### 生產環境設定

```yaml
environment:
  - TZ=Asia/Taipei
  - JWT_SECRET=your-production-secret
  - HTTP_ALLOWED=false
  - TRUST_PROXY=true
  - ACCOUNT_REGISTRATION=false
  - AUTO_DELETE_EVERY_N_HOURS=24
```

完整環境變數說明請參考 [環境變數文件](../config/environment.md)。

---

## 重啟策略

```yaml
restart: unless-stopped  # 推薦
restart: always          # 總是重啟
restart: on-failure      # 僅失敗時重啟
restart: "no"            # 不自動重啟
```

---

## 資源限制

```yaml
deploy:
  resources:
    limits:
      memory: 4G
      cpus: "2"
    reservations:
      memory: 1G
      cpus: "0.5"
```

---

## 健康檢查

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/healthcheck"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## 完整範例

請參考 [Docker Compose 範例資料夾](../docker-compose/)：

- `compose.minimal.yml` - 最精簡設定
- `compose.production.yml` - 生產環境
- `compose.reference.yml` - 完整參考
