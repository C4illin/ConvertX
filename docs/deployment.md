# 進階部署指南

> ⚠️ **此文件已遷移**
>
> 本文件內容已整合至新的文件結構，請參閱：
>
> - 🐳 [Docker 部署](deployment/docker.md)
> - 🔧 [反向代理設定](deployment/reverse-proxy.md)
> - 🔒 [安全性設定](configuration/security.md)
>
> 此文件將在未來版本中移除。

---

本文件說明如何在生產環境中部署 ConvertX-CN，包括 Reverse Proxy、HTTPS、安全性設定等。

---

## 目錄

- [部署前檢查清單](#部署前檢查清單)
- [Reverse Proxy 設定](#reverse-proxy-設定)
  - [Nginx](#nginx)
  - [Traefik](#traefik)
  - [Caddy](#caddy)
- [HTTPS 設定](#https-設定)
- [安全性建議](#安全性建議)
- [子路徑部署](#子路徑部署)
- [效能調整](#效能調整)
- [備份與還原](#備份與還原)

---

## 部署前檢查清單

在部署到生產環境前，請確認以下項目：

- [ ] 已建立 `data` 資料夾（實體資料夾，非匿名 volume）
- [ ] 已設定固定的 `JWT_SECRET`（至少 32 字元）
- [ ] 已關閉 `ACCOUNT_REGISTRATION`（或確認要開放註冊）
- [ ] 已設定 `TRUST_PROXY=true`（若使用 Reverse Proxy）
- [ ] 已設定 `HTTP_ALLOWED=false`（若有 HTTPS）
- [ ] 已設定防火牆規則
- [ ] 已設定定期備份

---

## Reverse Proxy 設定

### 重要環境變數

透過 Reverse Proxy 存取時，請設定：

```yaml
environment:
  - TRUST_PROXY=true # 信任 X-Forwarded-* headers
  - HTTP_ALLOWED=false # Proxy 已處理 HTTPS
```

### Nginx

```nginx
# /etc/nginx/sites-available/convertx
server {
    listen 80;
    server_name convertx.example.com;

    # 強制跳轉 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name convertx.example.com;

    # SSL 憑證（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/convertx.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/convertx.example.com/privkey.pem;

    # SSL 安全設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # 檔案上傳大小限制（根據需求調整）
    client_max_body_size 500M;

    # 上傳超時設定
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # 必要的 headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支援（若需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Traefik

#### 使用 Docker Labels

```yaml
# docker-compose.yml
services:
  convertx:
    image: convertx/convertx-cn:latest
    container_name: convertx-cn
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - JWT_SECRET=your-secret-key
      - TRUST_PROXY=true
      - HTTP_ALLOWED=false
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.convertx.rule=Host(`convertx.example.com`)"
      - "traefik.http.routers.convertx.entrypoints=websecure"
      - "traefik.http.routers.convertx.tls=true"
      - "traefik.http.routers.convertx.tls.certresolver=letsencrypt"
      - "traefik.http.services.convertx.loadbalancer.server.port=3000"
    networks:
      - traefik-network

networks:
  traefik-network:
    external: true
```

#### 使用動態配置檔

```yaml
# traefik/dynamic/convertx.yml
http:
  routers:
    convertx:
      rule: "Host(`convertx.example.com`)"
      service: convertx
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    convertx:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"
```

### Caddy

```
# Caddyfile
convertx.example.com {
    reverse_proxy 127.0.0.1:3000

    # 檔案上傳大小限制
    request_body {
        max_size 500MB
    }
}
```

Caddy 會自動處理 HTTPS 憑證。

---

## HTTPS 設定

### Let's Encrypt（推薦）

使用 Certbot 取得免費憑證：

```bash
# 安裝 Certbot
sudo apt install certbot python3-certbot-nginx

# 取得憑證（Nginx）
sudo certbot --nginx -d convertx.example.com

# 自動續約測試
sudo certbot renew --dry-run
```

### 自簽憑證（測試用）

```bash
# 產生自簽憑證
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/convertx.key \
  -out /etc/ssl/certs/convertx.crt \
  -subj "/CN=convertx.example.com"
```

---

## 安全性建議

### 1. 環境變數設定

```yaml
environment:
  # 必須設定固定值
  - JWT_SECRET=使用 openssl rand -hex 32 產生

  # 關閉不需要的功能
  - ACCOUNT_REGISTRATION=false
  - ALLOW_UNAUTHENTICATED=false
  - HTTP_ALLOWED=false

  # 定期清理檔案
  - AUTO_DELETE_EVERY_N_HOURS=24
```

### 2. 防火牆設定

```bash
# 只開放 80 和 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 不要直接開放 3000 埠
```

### 3. Docker 網路隔離

```yaml
services:
  convertx:
    # 只監聽 localhost
    ports:
      - "127.0.0.1:3000:3000"
```

### 4. 資源限制

```yaml
services:
  convertx:
    deploy:
      resources:
        limits:
          cpus: "4"
          memory: 8G
        reservations:
          cpus: "1"
          memory: 2G
```

---

## 子路徑部署

若需要在子路徑部署（如 `https://example.com/convertx/`）：

### 環境變數

```yaml
environment:
  - WEBROOT=/convertx
```

### Nginx 設定

```nginx
location /convertx/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## 效能調整

### 1. 限制同時轉換數

```yaml
environment:
  - MAX_CONVERT_PROCESS=4
```

### 2. FFmpeg 硬體加速

```yaml
environment:
  # NVIDIA GPU
  - FFMPEG_ARGS=-hwaccel cuda

  # Intel QSV
  - FFMPEG_ARGS=-hwaccel qsv

  # AMD VAAPI
  - FFMPEG_ARGS=-hwaccel vaapi
```

### 3. 容器資源限制

見上方「資源限制」區塊。

---

## 備份與還原

### 備份

```bash
# 停止容器
docker compose stop

# 備份 data 資料夾
tar -czvf convertx-backup-$(date +%Y%m%d).tar.gz data/

# 重新啟動
docker compose start
```

### 自動備份腳本

```bash
#!/bin/bash
# /opt/scripts/backup-convertx.sh

BACKUP_DIR="/opt/backups/convertx"
DATA_DIR="/opt/convertx/data"
KEEP_DAYS=7

# 建立備份
mkdir -p $BACKUP_DIR
tar -czvf "$BACKUP_DIR/convertx-$(date +%Y%m%d).tar.gz" -C $(dirname $DATA_DIR) $(basename $DATA_DIR)

# 清理舊備份
find $BACKUP_DIR -name "convertx-*.tar.gz" -mtime +$KEEP_DAYS -delete
```

加入 crontab：

```bash
# 每天凌晨 3 點備份
0 3 * * * /opt/scripts/backup-convertx.sh
```

### 還原

```bash
# 停止容器
docker compose stop

# 還原 data 資料夾
tar -xzvf convertx-backup-20260120.tar.gz

# 重新啟動
docker compose start
```

---

## 常見問題

### 問題：Reverse Proxy 後登入失敗

**解決方案**：設定 `TRUST_PROXY=true`

### 問題：上傳大檔案失敗

**解決方案**：調整 Nginx 的 `client_max_body_size`

### 問題：轉換超時

**解決方案**：調整 Nginx 的 `proxy_read_timeout`

---

## 相關文件

- [環境變數完整說明](environment-variables.md)
- [Docker Compose 範例](docker-compose/)
- [常見問題](faq.md)
