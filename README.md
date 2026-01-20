![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務** — 一個 Docker 命令，5 分鐘部署完成

[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)

---

## 為什麼選擇 ConvertX-CN？

- 支援 **1000+ 格式**（影音、圖片、文件、電子書）
- 已內建 LibreOffice、FFmpeg、Pandoc 等 20+ 轉換器
- 預載中日韓字型與 OCR 語言包
- 支援 65 種介面語言

---

## 線上示範

想先試用再部署？歡迎使用我們的示範站：

🔗 **https://convertx-cn.bioailab.qzz.io**

| 項目     | 內容              |
| -------- | ----------------- |
| 範例帳號 | admin@example.com |
| 範例密碼 | admin             |

> ⚠️ 示範站僅供測試，請勿上傳敏感檔案。資料可能定期清除。

---

## 快速啟動（Docker Run）

### 1. 建立資料夾

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn
```

### 2. 啟動容器

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=e78a2da4-135f-06a8-fa46-17ef7990f5d1 \
  convertx/convertx-cn:latest
```

### 3. 開啟瀏覽器

```bash
  http://localhost:3000
```

> 首次下載約 4-6 GB，請耐心等待。

---

## Docker Compose（推薦）

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
      #請改成你自己的隨機字串至少32字元
      - JWT_SECRET=e78a2da4-135f-06a8-fa46-17ef7990f5d1
```

啟動：

```bash
docker compose up -d
```

更多範例 → [docs/docker-compose/](docs/docker-compose/)

---

## 重要：資料夾說明

`./data` 是你**主機上的實體資料夾**，用於存放上傳檔案、轉換結果與使用者資料。

| 作業系統      | 建立指令                      |
| ------------- | ----------------------------- |
| Linux / macOS | `mkdir -p ~/convertx-cn/data` |
| Windows (PS)  | `mkdir C:\convertx-cn\data`   |
| Windows (CMD) | `mkdir C:\convertx-cn\data`   |

> 若不先建立，Docker 會建立匿名 volume，導致資料難以存取或備份。

---

## 必要參數

| 參數         | 說明                               |
| ------------ | ---------------------------------- |
| `./data`     | 主機資料夾，必須先建立             |
| `JWT_SECRET` | 登入驗證金鑰，不設會每次重啟被登出 |

其他環境變數 → [docs/config/environment.md](docs/config/environment.md)

---

## 常見問題

| 問題                 | 解法                                           |
| -------------------- | ---------------------------------------------- |
| 登入後又被踢回登入頁 | 加上 `HTTP_ALLOWED=true` 或 `TRUST_PROXY=true` |
| 重啟後資料消失       | 確認 `./data:/app/data` 且資料夾存在           |
| 重啟後被登出         | 設定固定的 `JWT_SECRET`                        |

更多問題 → [docs/faq.md](docs/faq.md)

---

## 支援格式

| 轉換器      | 用途   | 格式數 |
| ----------- | ------ | ------ |
| FFmpeg      | 影音   | 400+   |
| ImageMagick | 圖片   | 200+   |
| LibreOffice | 文件   | 60+    |
| Pandoc      | 文件   | 100+   |
| Calibre     | 電子書 | 40+    |
| Inkscape    | 向量圖 | 20+    |

完整列表 → [docs/converters.md](docs/converters.md)

---

## 語言支援

支援 **65 種語言**，包含繁體中文、簡體中文、英文、日文、韓文等。

語言會根據瀏覽器設定自動偵測，也可透過右上角選單手動切換。

詳細說明 → [docs/i18n.md](docs/i18n.md)

---

## 版本與更新

```bash
docker compose down
docker compose pull
docker compose up -d
```

- 版本說明 → [docs/versions/](docs/versions/)
- 更新指南 → [docs/deployment/update.md](docs/deployment/update.md)
- Changelog → [CHANGELOG.md](CHANGELOG.md)

---

## 進階文件

| 文件                                   | 說明                      |
| -------------------------------------- | ------------------------- |
| [環境變數](docs/config/environment.md) | 所有可用參數              |
| [安全性設定](docs/config/security.md)  | HTTP_ALLOWED、TRUST_PROXY |
| [反向代理](docs/deployment.md)         | Nginx / Traefik / Caddy   |
| [Docker 進階](docs/docker.md)          | 自訂 Build                |
| [FAQ](docs/faq.md)                     | 疑難排解                  |

---

## 預覽

![ConvertX-CN Preview](images/preview.png)

---

## License

[MIT](LICENSE) | 基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX)
