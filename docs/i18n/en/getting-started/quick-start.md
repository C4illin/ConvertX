# Quick Start

> 🌐 **Language / 語言**
> [繁體中文](../../getting-started/quick-start.md) | **English** | [简体中文](../zh-CN/getting-started/quick-start.md)

> 🌐 **Translation Info**
>
> - Original: [繁體中文版](../../getting-started/quick-start.md)
> - Translation Version: v0.1.0
> - Last Updated: 2026-01-23
> - Status: 🚧 In Progress

---

Deploy ConvertX-CN in 5 minutes.

---

## Prerequisites

- Docker 20.10+ ([Install Guide](https://docs.docker.com/get-docker/))
- 4GB+ RAM
- 10GB+ Disk Space

---

## Method 1: Docker Run (Fastest)

### 1. Create Data Folder

```bash
# Linux / macOS
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn

# Windows PowerShell
mkdir C:\convertx-cn\data; cd C:\convertx-cn

# Windows CMD
mkdir C:\convertx-cn\data
cd C:\convertx-cn
```

### 2. Start Container

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=your-random-string-at-least-32-chars \
  convertx/convertx-cn:latest
```

### 3. Start Using

Open browser: `http://localhost:3000`

1. Click **Register** in the top right corner
2. Enter Email and Password
3. Done! Start converting files

---

## Method 2: Docker Compose (Recommended)

### 1. Create Project Folder

```bash
mkdir -p ~/convertx-cn && cd ~/convertx-cn
```

### 2. Create Configuration File

Create `docker-compose.yml`:

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
      - JWT_SECRET=please-replace-with-a-long-random-string
```

### 3. Start Service

```bash
docker compose up -d
```

---

## Verify Installation

### Check Container Status

```bash
docker ps
# Should see convertx-cn container running

docker logs convertx-cn
# Should see "🦊 Elysia is running at http://localhost:3000"
```

### Health Check

```bash
curl http://localhost:3000/healthcheck
# Should return "OK"
```

---

## Common Startup Issues

| Issue                           | Solution                                      |
| ------------------------------- | --------------------------------------------- |
| Port already in use             | Use another port, e.g., `-p 8080:3000`        |
| Redirected to login after login | Add `HTTP_ALLOWED=true` or `TRUST_PROXY=true` |
| Logged out after restart        | Set a fixed `JWT_SECRET`                      |
| Data lost after restart         | Confirm `./data:/app/data` and folder exists  |
| Permission error                | Run `chmod -R 777 ./data`                     |

---

## Next Steps

- 📖 [Docker Configuration](../deployment/docker.md)
- ⚙️ [Environment Variables](../configuration/environment-variables.md)
- 🔒 [Security Settings](../configuration/security.md)
- 🔧 [Reverse Proxy Setup](../deployment/reverse-proxy.md)
