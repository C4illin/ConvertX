# 進階用法

## 硬體加速

### NVIDIA GPU (CUDA/NVENC)

#### 1. 安裝 NVIDIA Container Toolkit

```bash
# Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

#### 2. Docker Compose 配置

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

---

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

---

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

## 反向代理

### Nginx

```nginx
server {
    listen 80;
    server_name convert.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name convert.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    client_max_body_size 0;  # 無檔案大小限制

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 長時間連線支援（大檔案轉換）
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

### Caddy

```
convert.example.com {
    reverse_proxy localhost:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    request_body {
        max_size 0  # 無限制
    }
}
```

### Traefik

參考 [docker.md](docker.md#使用-traefik-反向代理) 中的 Traefik 配置。

---

## 子路徑部署

如果需要在子路徑部署（如 `https://example.com/convertx`）：

### 1. 設定環境變數

```yaml
environment:
  - WEBROOT=/convertx
```

### 2. Nginx 配置

```nginx
location /convertx/ {
    proxy_pass http://localhost:3000/;
    # ... 其他 proxy 設定
}
```

### 3. Caddy 配置

```
example.com {
    handle_path /convertx/* {
        reverse_proxy localhost:3000
    }
}
```

---

## 限制同時轉換數

防止伺服器過載：

```yaml
environment:
  - MAX_CONVERT_PROCESS=4  # 最多同時 4 個轉換任務
```

---

## 匿名模式

允許不登入即可使用：

```yaml
environment:
  - ALLOW_UNAUTHENTICATED=true
  - HIDE_HISTORY=true  # 建議同時隱藏歷史
  - AUTO_DELETE_EVERY_N_HOURS=1  # 快速清理
```

---

## 高可用部署

### 多容器部署

ConvertX-CN 支援多容器部署，但需注意：

1. **共享儲存**：所有容器需存取相同的 `/app/data` 目錄
2. **資料庫鎖定**：SQLite 在高併發下可能有問題
3. **JWT Secret**：所有容器需使用相同的 `JWT_SECRET`

```yaml
services:
  convertx-1:
    image: convertx/convertx-cn:latest
    volumes:
      - shared-data:/app/data
    environment:
      - JWT_SECRET=${JWT_SECRET}
  
  convertx-2:
    image: convertx/convertx-cn:latest
    volumes:
      - shared-data:/app/data
    environment:
      - JWT_SECRET=${JWT_SECRET}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  shared-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server,rw
      device: ":/path/to/shared/data"
```

---

## 效能調優

### 記憶體限制

```yaml
deploy:
  resources:
    limits:
      memory: 8G
    reservations:
      memory: 2G
```

### CPU 限制

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
    reservations:
      cpus: '1'
```

---

## 日誌管理

### 查看日誌

```bash
docker logs convertx-cn
docker logs -f convertx-cn  # 即時追蹤
docker logs --tail 100 convertx-cn  # 最後 100 行
```

### 日誌輪轉

```yaml
services:
  convertx:
    # ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```
