![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務** — 5 分鐘完成部署

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
```

> Windows 請用 `mkdir C:\convertx-cn\data` 並 `cd C:\convertx-cn`

### 2. 建立 docker-compose.yml

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
      - JWT_SECRET=請改成你自己的隨機字串至少32字元
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

首次下載約 4-6 GB，需等待幾分鐘。

### 4. 使用

開啟 `http://localhost:3000`，註冊帳號即可使用。

---

## 常見問題

| 問題                 | 解法                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| 登入後又被踢回登入頁 | 設定 `HTTP_ALLOWED=true`（本地測試）或 `TRUST_PROXY=true`（反向代理） |
| 重啟後資料消失       | 確認 `./data:/app/data` 且資料夾存在                                  |
| 重啟後被登出         | 設定固定的 `JWT_SECRET`                                               |

更多問題 → [docs/faq.md](docs/faq.md)

---

## 更新版本

```bash
cd ~/convertx-cn
docker compose down
docker compose pull
docker compose up -d
```

詳細說明 → [docs/deployment/update.md](docs/deployment/update.md)

---

## 進階設定

| 需求                | 文件                                                     |
| ------------------- | -------------------------------------------------------- |
| 完整環境變數        | [docs/config/environment.md](docs/config/environment.md) |
| 反向代理 / HTTPS    | [docs/deployment.md](docs/deployment.md)                 |
| 安全性設定          | [docs/config/security.md](docs/config/security.md)       |
| Docker Compose 範例 | [docs/docker-compose/](docs/docker-compose/)             |
| 版本選擇指南        | [docs/versions/](docs/versions/)                         |

---

## 預覽

![ConvertX-CN Preview](images/preview.png)

---

## License

[MIT](LICENSE) | 基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX)
