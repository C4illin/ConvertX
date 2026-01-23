# 支援的轉換器

ConvertX-CN 完整版已內建 20+ 種轉換器，支援 1000+ 種格式。

---

## 轉換器總覽

| 轉換器           | 用途         | 輸入格式 | 輸出格式 |
| ---------------- | ------------ | -------- | -------- |
| FFmpeg           | 影音         | ~472     | ~199     |
| ImageMagick      | 圖片         | 245      | 183      |
| GraphicsMagick   | 圖片         | 167      | 130      |
| Vips             | 高效圖片處理 | 45       | 23       |
| LibreOffice      | 文件         | 41       | 22       |
| Pandoc           | 文件         | 43       | 65       |
| Calibre          | 電子書       | 26       | 19       |
| Inkscape         | 向量圖形     | 7        | 17       |
| libjxl           | JPEG XL      | 11       | 11       |
| libheif          | HEIF         | 2        | 4        |
| Assimp           | 3D 模型      | 77       | 23       |
| Potrace          | 點陣轉向量   | 4        | 11       |
| VTracer          | 點陣轉向量   | 8        | 1        |
| resvg            | SVG          | 1        | 1        |
| XeLaTeX          | LaTeX        | 1        | 1        |
| dvisvgm          | 向量圖形     | 4        | 2        |
| Dasel            | 資料檔案     | 5        | 4        |
| msgconvert       | Outlook      | 1        | 1        |
| VCF to CSV       | 聯絡人       | 1        | 1        |
| Markitdown       | 文件         | 6        | 1        |
| MinerU           | PDF → MD     | 1        | 2        |
| PDFMathTranslate | PDF 翻譯     | 1        | 15+      |

---

## 影音轉換

### FFmpeg

最強大的影音轉換工具，支援幾乎所有影音格式。

**常見輸入格式：**

- 影片：MP4, MKV, AVI, MOV, WebM, FLV, WMV...
- 音訊：MP3, WAV, FLAC, AAC, OGG, M4A...

**常見輸出格式：**

- 影片：MP4, WebM, MKV, GIF...
- 音訊：MP3, WAV, FLAC, AAC...

**硬體加速：**

```yaml
environment:
  - FFMPEG_ARGS=-hwaccel cuda
  - FFMPEG_OUTPUT_ARGS=-c:v h264_nvenc
```

---

## 圖片處理

### ImageMagick

通用圖片處理工具，支援 200+ 種格式。

**支援格式：**

- 點陣圖：PNG, JPG, GIF, BMP, TIFF, WebP...
- RAW：CR2, NEF, ARW, DNG...
- 其他：PSD, PDF, EPS...

### Vips

高效能圖片處理，適合大型圖片。

**優勢：**

- 記憶體使用效率高
- 處理速度快
- 適合批次處理

### 向量圖形

| 工具     | 用途           |
| -------- | -------------- |
| Inkscape | SVG 編輯與轉換 |
| Potrace  | 點陣圖轉向量   |
| VTracer  | 照片轉向量     |
| resvg    | SVG 渲染       |

---

## 文件轉換

### LibreOffice

辦公文件轉換引擎。

**輸入格式：**

- Microsoft Office：DOC, DOCX, XLS, XLSX, PPT, PPTX
- OpenDocument：ODT, ODS, ODP
- 其他：RTF, TXT, CSV

**輸出格式：**

- PDF, DOCX, ODT, TXT, HTML, EPUB...

### Pandoc

標記語言文件轉換。

**輸入格式：**

- Markdown, reStructuredText, Org-mode
- HTML, LaTeX, EPUB
- Word, ODT

**輸出格式：**

- PDF, DOCX, HTML, LaTeX
- EPUB, Markdown, 純文字

### Calibre

電子書轉換專家。

**輸入格式：**

- EPUB, MOBI, AZW, AZW3
- PDF, HTML, TXT
- CBZ, CBR（漫畫）

**輸出格式：**

- EPUB, MOBI, AZW3
- PDF, HTML, TXT

---

## 進階功能

### MinerU

將 PDF 轉換為結構化 Markdown。

**輸出模式：**

- `md-t`：表格以 Markdown 呈現
- `md-i`：表格以圖片呈現

**輸出格式：** `.tar` 封裝

### PDFMathTranslate

翻譯 PDF 同時保留數學公式與排版。

**支援目標語言：**

- 英文 (pdf-en)
- 繁體中文 (pdf-zh-TW)
- 簡體中文 (pdf-zh)
- 日文 (pdf-ja)
- 韓文 (pdf-ko)
- 德文、法文等

**特色：**

- 保留數學公式
- 保留圖表
- 保留排版

**環境變數：**

```yaml
- PDFMATHTRANSLATE_SERVICE=google # 翻譯服務
```

### OCR (Tesseract)

光學字元辨識，將圖片文字轉為可編輯文字。

**內建語言：**

- 繁體中文、簡體中文
- 日文、韓文
- 英文、德文、法文

---

## 內建依賴

ConvertX-CN 完整版已預載：

| 類別         | 內建內容                                     |
| ------------ | -------------------------------------------- |
| **文件轉換** | LibreOffice (headless)、Pandoc               |
| **LaTeX**    | TexLive Full                                 |
| **OCR**      | Tesseract + 繁/簡中、日、韓、英、德語言包    |
| **CJK 字型** | Noto CJK、Noto Emoji、微軟核心字型、標楷體   |
| **影音轉換** | FFmpeg、ImageMagick、GraphicsMagick          |
| **向量圖形** | Inkscape、Potrace、VTracer、resvg            |
| **電子書**   | Calibre                                      |
| **其他**     | Ghostscript、MuPDF、Poppler、libheif、libjxl |

---

## 新增轉換器

如需新增轉換器支援，歡迎：

1. 📝 [提交 Issue](https://github.com/pi-docket/ConvertX-CN/issues)
2. 🔧 [發送 Pull Request](https://github.com/pi-docket/ConvertX-CN/pulls)

---

## 相關文件

- [OCR 功能](ocr.md)
- [翻譯功能](translation.md)
- [Docker 部署](../deployment/docker.md)
