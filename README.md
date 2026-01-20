![ConvertX](images/logo.png)

# ConvertX-CN（完整版）

[![Docker](https://github.com/pi-docket/ConvertX-CN/actions/workflows/release.yml/badge.svg)](https://github.com/pi-docket/ConvertX-CN/actions/workflows/release.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/convertx/convertx-cn?style=flat&logo=docker&label=Docker%20Hub)](https://hub.docker.com/r/convertx/convertx-cn)
[![GitHub Release](https://img.shields.io/github/v/release/pi-docket/ConvertX-CN)](https://github.com/pi-docket/ConvertX-CN/releases)

> 🎉 **這是完整版 ConvertX-CN image，已內建所有轉換依賴！**
>
> 使用者 **不需要自己寫 Dockerfile**，直接 `docker run` 或 `docker compose up` 即可使用。

基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX) 的中文優化版本。目前還在實作請等到1月底發布

---

## ✨ 完整版特色

此 image 已經內建以下所有依賴，開箱即用：

| 類別         | 內建內容                                                         |
| ------------ | ---------------------------------------------------------------- |
| **文件轉換** | LibreOffice (headless)、Pandoc                                   |
| **LaTeX**    | TexLive Full（完整版，支援所有 LaTeX 需求）                      |
| **OCR 識別** | Tesseract OCR + 繁體中文、簡體中文、日文、韓文、英文、德文語言包 |
| **CJK 字型** | Noto CJK（中日韓）、Noto Emoji、微軟核心字型、標楷體             |
| **影音轉換** | FFmpeg、ImageMagick、GraphicsMagick                              |
| **向量圖形** | Inkscape、Potrace、VTracer、resvg                                |
| **電子書**   | Calibre                                                          |
| **其他**     | Ghostscript、MuPDF、Poppler、libheif、libjxl 等                  |

---

## 🚀 快速開始

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

然後瀏覽 `http://localhost:3000` 並建立第一個帳號。

---

## 📦 Docker Image

| Image                         | 說明       |
| ----------------------------- | ---------- |
| `convertx/convertx-cn:latest` | 最新穩定版 |
| `convertx/convertx-cn:v0.1.1` | 指定版本   |

> ⚠️ 由於內建完整依賴，image 大小約 4-6 GB，首次下載需要較長時間。

---

## 🔧 支援的轉換器

| Converter                                                       | Use case         | Converts from | Converts to |
| --------------------------------------------------------------- | ---------------- | ------------- | ----------- |
| [Inkscape](https://inkscape.org/)                               | Vector images    | 7             | 17          |
| [libjxl](https://github.com/libjxl/libjxl)                      | JPEG XL          | 11            | 11          |
| [resvg](https://github.com/RazrFalcon/resvg)                    | SVG              | 1             | 1           |
| [Vips](https://github.com/libvips/libvips)                      | Images           | 45            | 23          |
| [libheif](https://github.com/strukturag/libheif)                | HEIF             | 2             | 4           |
| [XeLaTeX](https://tug.org/xetex/)                               | LaTeX            | 1             | 1           |
| [Calibre](https://calibre-ebook.com/)                           | E-books          | 26            | 19          |
| [LibreOffice](https://www.libreoffice.org/)                     | Documents        | 41            | 22          |
| [Dasel](https://github.com/TomWright/dasel)                     | Data Files       | 5             | 4           |
| [Pandoc](https://pandoc.org/)                                   | Documents        | 43            | 65          |
| [msgconvert](https://github.com/mvz/email-outlook-message-perl) | Outlook          | 1             | 1           |
| VCF to CSV                                                      | Contacts         | 1             | 1           |
| [dvisvgm](https://dvisvgm.de/)                                  | Vector images    | 4             | 2           |
| [ImageMagick](https://imagemagick.org/)                         | Images           | 245           | 183         |
| [GraphicsMagick](http://www.graphicsmagick.org/)                | Images           | 167           | 130         |
| [Assimp](https://github.com/assimp/assimp)                      | 3D Assets        | 77            | 23          |
| [FFmpeg](https://ffmpeg.org/)                                   | Video            | ~472          | ~199        |
| [Potrace](https://potrace.sourceforge.net/)                     | Raster to vector | 4             | 11          |
| [VTracer](https://github.com/visioncortex/vtracer)              | Raster to vector | 8             | 1           |
| [Markitdown](https://github.com/microsoft/markitdown)           | Documents        | 6             | 1           |

<!-- many ffmpeg fileformats are duplicates -->

缺少什麼轉換器？歡迎開 issue 或 pull request！

---

## ⚙️ 環境變數

所有環境變數皆為選填，建議設定 `JWT_SECRET`。

| 變數名稱                  | 預設值       | 說明                                     |
| ------------------------- | ------------ | ---------------------------------------- |
| JWT_SECRET                | randomUUID() | 用於簽署 JWT 的密鑰字串                  |
| ACCOUNT_REGISTRATION      | false        | 是否允許註冊新帳號                       |
| HTTP_ALLOWED              | false        | 是否允許 HTTP 連線（僅本地使用）         |
| ALLOW_UNAUTHENTICATED     | false        | 是否允許未登入使用                       |
| AUTO_DELETE_EVERY_N_HOURS | 24           | 自動刪除超過 N 小時的檔案（0 = 停用）    |
| WEBROOT                   |              | 子路徑部署，例如 `/convertx`             |
| FFMPEG_ARGS               |              | FFmpeg 輸入參數，例如 `-hwaccel vaapi`   |
| FFMPEG_OUTPUT_ARGS        |              | FFmpeg 輸出參數，例如 `-preset veryfast` |
| HIDE_HISTORY              | false        | 隱藏歷史紀錄頁面                         |
| LANGUAGE                  | en           | 日期格式語言（BCP 47 格式）              |
| TZ                        | UTC          | 時區設定                                 |
| MAX_CONVERT_PROCESS       | 0            | 最大同時轉換數（0 = 無限制）             |

---

## 🌍 多語言支援（i18n）

ConvertX-CN 支援以下語言：

| 語言代碼 | 語言名稱         |
| -------- | ---------------- |
| zh-TW    | 繁體中文（預設） |
| zh-CN    | 简体中文         |
| en       | English          |
| ja       | 日本語           |
| ko       | 한국어           |

### 語言切換

- 在網站右上角的導航列可看到語言選擇器（地球圖示）
- 點擊後可選擇偏好語言
- 語言偏好會自動保存到 Cookie 中
- 首次訪問時會自動偵測瀏覽器語言設定

### 新增語言

如要添加新語言，請：

1. 在 `src/locales/` 目錄新增語言檔案（例如 `fr.json`）
2. 在 `src/i18n/index.ts` 中：
   - 導入新語言檔案
   - 在 `supportedLocales` 陣列中添加語言配置
   - 在 `translations` 物件中註冊翻譯

歡迎提交 Pull Request 來新增更多語言！

---

## 📖 教學文章

> [!NOTE]
> 以下教學由社群撰寫，可能有過時或錯誤之處。

- 法文教學：<https://belginux.com/installer-convertx-avec-docker/>
- 中文教學：<https://xzllll.com/24092901/>
- 波蘭文教學：<https://www.kreatywnyprogramista.pl/convertx-lokalny-konwerter-plikow>

---

## 📸 Screenshots

![ConvertX Preview](images/preview.png)

## 🛠️ 開發

0. 安裝 [Bun](https://bun.sh/) 和 Git
1. Clone 這個 repository
2. `bun install`
3. `bun run dev`

歡迎 Pull Request！請使用 [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) 格式。

---

## 🙏 致謝

本專案基於 [C4illin/ConvertX](https://github.com/C4illin/ConvertX) 開發。

<a href="https://github.com/C4illin/ConvertX/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=C4illin/ConvertX" alt="Image with all contributors"/>
</a>

---

## 📜 License

MIT License
