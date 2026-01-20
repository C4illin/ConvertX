![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務**

[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)

---

## 這是什麼？

自架的檔案轉換服務，支援 **1000+ 格式**，包含影音、圖片、文件、電子書等。  
已內建 LibreOffice、FFmpeg、Pandoc 等 20+ 轉換器與中日韓字型，**一個 Docker 命令就能跑**。

---

## 快速部署

### 1. 建立資料夾

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn

docker run -d \
  --name convertx-cn \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e JWT_SECRET=your-secret-key-at-least-32-chars \
  convertx/convertx-cn:latest
```

開啟 `http://localhost:3000` 註冊即可使用。

> Windows 用戶請先 `mkdir C:\convertx-cn\data`，並將 `./data` 改為 `C:\convertx-cn\data`

---

## ✅ 推薦方式（Docker Compose）

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
      - JWT_SECRET=your-secret-key-at-least-32-chars
```

| 參數         | 說明                               | 必要 |
| ------------ | ---------------------------------- | ---- |
| `./data`     | 存放檔案的資料夾，必須先建立       | ✅   |
| `JWT_SECRET` | 登入驗證金鑰，不設會每次重啟被登出 | ✅   |
| `TZ`         | 時區（預設 UTC）                   | —    |

### 3. 啟動

```bash
docker compose up -d
```

| 參數         | 說明               |
| ------------ | ------------------ |
| `./data`     | 資料夾，需先建立   |
| `JWT_SECRET` | 登入金鑰，必須設定 |

首次下載約 4-6 GB。

---

## 支援格式

| 類型   | 轉換器                     | 格式數 |
| ------ | -------------------------- | ------ |
| 影音   | FFmpeg                     | 400+   |
| 圖片   | ImageMagick, libvips       | 200+   |
| 文件   | LibreOffice, Pandoc        | 150+   |
| 電子書 | Calibre                    | 40+    |
| 向量圖 | Inkscape, resvg, Potrace   | 20+    |
| 資料   | Dasel (JSON/YAML/TOML/XML) | 10+    |

完整列表 → [docs/converters.md](docs/converters.md)

---

## 常見問題

| 問題         | 解法                                           |
| ------------ | ---------------------------------------------- |
| 登入後被踢回 | 設定 `HTTP_ALLOWED=true` 或 `TRUST_PROXY=true` |
| 資料消失     | 確認 `./data:/app/data` 已掛載                 |
| 重啟後登出   | 設定固定 `JWT_SECRET`                          |

更多 → [docs/faq.md](docs/faq.md)

---

## 進階文件

| 主題             | 連結                                                     |
| ---------------- | -------------------------------------------------------- |
| 環境變數         | [docs/config/environment.md](docs/config/environment.md) |
| 安全性設定       | [docs/config/security.md](docs/config/security.md)       |
| 反向代理 / HTTPS | [docs/deployment.md](docs/deployment.md)                 |
| Docker Compose   | [docs/docker-compose/](docs/docker-compose/)             |
| 版本選擇         | [docs/versions/](docs/versions/)                         |
| 更新方法         | [docs/deployment/update.md](docs/deployment/update.md)   |

---

## 預覽

![ConvertX-CN Preview](images/preview.png)

---

[MIT](LICENSE) | 基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX)
