![ConvertX-CN](images/logo.png)

# ConvertX-CN

**開箱即用的全功能檔案轉換服務** — 一個 Docker 命令，5 分鐘部署完成

[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)
[![License AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## 為什麼選擇 ConvertX-CN？

| 特色              | 說明                                    |
| ----------------- | --------------------------------------- |
| 📁 **1000+ 格式** | 文件、圖片、影音、電子書一次搞定        |
| 🔧 **20+ 引擎**   | LibreOffice、FFmpeg、Pandoc 全到位      |
| 🈶 **中文優化**   | 內建中日韓字型與 OCR，告別亂碼          |
| 🌐 **65 種語言**  | 跨國團隊無障礙使用                      |
| 📊 **PDF 翻譯**   | PDFMathTranslate + BabelDOC 雙引擎      |
| 📄 **PDF 轉 MD**  | MinerU 智能擷取（保留表格、公式、圖片） |

---

## 📚 文件

完整文件請參閱 **[文件中心](docs/README.md)**

| 分類        | 連結                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| 🚀 快速入門 | [概覽](docs/快速入門/概覽.md) · [快速開始](docs/快速入門/快速開始.md) · [FAQ](docs/快速入門/常見問題.md) |
| 🐳 部署指南 | [Docker](docs/部署指南/Docker.md) · [反向代理](docs/部署指南/反向代理.md)                                |
| ⚙️ 配置設定 | [環境變數](docs/配置設定/環境變數.md) · [安全性](docs/配置設定/安全性.md)                                |
| 🔌 功能說明 | [轉換器](docs/功能說明/轉換器.md) · [OCR](docs/功能說明/OCR.md) · [翻譯](docs/功能說明/翻譯.md)          |
| 🔗 API      | [API 總覽](docs/API/總覽.md) · [端點說明](docs/API/端點.md)                                              |
| 👩‍💻 開發     | [專案結構](docs/開發指南/專案結構.md) · [貢獻指南](docs/開發指南/貢獻指南.md)                            |

---

## 🚀 快速開始

### Docker Run

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn && \
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=Xk9mPqL2vN7wR4tY6uI8oA3sD5fG1hJ0 \
  convertx/convertx-cn:latest
```

> ⚠️ **安全提醒**：正式環境請更換 `JWT_SECRET` 為自己的隨機字串（至少 32 字元）

開啟瀏覽器：`http://localhost:3000`

### Docker Compose（推薦）

> 💡 以下命令會自動建立 `~/convertx-cn/data` 資料夾、產生 `docker-compose.yml` 並啟動服務

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn && \
cat > docker-compose.yml << 'EOF'
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
      - JWT_SECRET=Xk9mPqL2vN7wR4tY6uI8oA3sD5fG1hJ0
EOF
docker compose up -d
```

> ⚠️ **安全提醒**：正式環境請更換 `JWT_SECRET` 為自己的隨機字串（至少 32 字元）

開啟瀏覽器：`http://localhost:3000`

> 📖 詳細說明請參閱 [快速開始](docs/快速入門/快速開始.md)

---

## 🔗 線上示範

🔗 **https://convertx-cn.bioailab.qzz.io**

| 項目 | 內容              |
| ---- | ----------------- |
| 帳號 | admin@example.com |
| 密碼 | admin             |

> ⚠️ 示範站僅供測試，請勿上傳敏感檔案，會定期清理資料。

---

## ⚡ 常見問題速查

| 問題               | 解決方法                                       |
| ------------------ | ---------------------------------------------- |
| 登入後被踢回登入頁 | 加上 `HTTP_ALLOWED=true` 或 `TRUST_PROXY=true` |
| 重啟後資料消失     | 確認 `./data:/app/data` 且資料夾存在           |
| 重啟後被登出       | 設定固定的 `JWT_SECRET`                        |

更多問題 → [FAQ](docs/快速入門/常見問題.md)

---

## 📦 支援格式

| 轉換器           | 用途            | 格式數 |
| ---------------- | --------------- | ------ |
| FFmpeg           | 影音            | 400+   |
| ImageMagick      | 圖片            | 200+   |
| LibreOffice      | 文件            | 60+    |
| Pandoc           | 文件            | 100+   |
| Calibre          | 電子書          | 40+    |
| Inkscape         | 向量圖          | 20+    |
| PDFMathTranslate | PDF 翻譯        | 15+    |
| BabelDOC         | PDF 翻譯/轉換   | 15+    |
| MinerU           | PDF 轉 Markdown | 10+    |

完整列表 → [轉換器文件](docs/功能說明/轉換器.md)

---

## 🖼️ 預覽

![ConvertX-CN Preview](images/preview.png)

---

## 🔄 更新

```bash
docker compose down
docker compose pull
docker compose up -d
```

---

## 📄 License

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.

Based on [C4illin/ConvertX](https://github.com/C4illin/ConvertX).
