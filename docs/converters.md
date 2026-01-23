# 支援的轉換器

> ⚠️ **此文件已遷移**
>
> 本文件內容已整合至新的文件結構，請參閱：
>
> - 🔌 [轉換器完整說明](features/converters.md)
> - 📊 [OCR 功能](features/ocr.md)
> - 🌐 [翻譯功能](features/translation.md)
>
> 此文件將在未來版本中移除。

---

ConvertX-CN 完整版已內建以下所有轉換器，開箱即用。

## 轉換器列表

| 轉換器                                                          | 用途       | 輸入格式數 | 輸出格式數 |
| --------------------------------------------------------------- | ---------- | ---------- | ---------- |
| [Inkscape](https://inkscape.org/)                               | 向量圖形   | 7          | 17         |
| [libjxl](https://github.com/libjxl/libjxl)                      | JPEG XL    | 11         | 11         |
| [resvg](https://github.com/RazrFalcon/resvg)                    | SVG        | 1          | 1          |
| [Vips](https://github.com/libvips/libvips)                      | 圖片       | 45         | 23         |
| [libheif](https://github.com/strukturag/libheif)                | HEIF       | 2          | 4          |
| [XeLaTeX](https://tug.org/xetex/)                               | LaTeX      | 1          | 1          |
| [Calibre](https://calibre-ebook.com/)                           | 電子書     | 26         | 19         |
| [LibreOffice](https://www.libreoffice.org/)                     | 文件       | 41         | 22         |
| [Dasel](https://github.com/TomWright/dasel)                     | 資料檔案   | 5          | 4          |
| [Pandoc](https://pandoc.org/)                                   | 文件       | 43         | 65         |
| [msgconvert](https://github.com/mvz/email-outlook-message-perl) | Outlook    | 1          | 1          |
| VCF to CSV                                                      | 聯絡人     | 1          | 1          |
| [dvisvgm](https://dvisvgm.de/)                                  | 向量圖形   | 4          | 2          |
| [ImageMagick](https://imagemagick.org/)                         | 圖片       | 245        | 183        |
| [GraphicsMagick](http://www.graphicsmagick.org/)                | 圖片       | 167        | 130        |
| [Assimp](https://github.com/assimp/assimp)                      | 3D 模型    | 77         | 23         |
| [FFmpeg](https://ffmpeg.org/)                                   | 影音       | ~472       | ~199       |
| [Potrace](https://potrace.sourceforge.net/)                     | 點陣轉向量 | 4          | 11         |
| [VTracer](https://github.com/visioncortex/vtracer)              | 點陣轉向量 | 8          | 1          |
| [Markitdown](https://github.com/microsoft/markitdown)           | 文件       | 6          | 1          |

> 註：FFmpeg 的格式數量包含部分重複格式。

## 內建依賴

ConvertX-CN 完整版已預載：

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

## 新增轉換器

如需新增轉換器支援，請至 [GitHub Issues](https://github.com/pi-docket/ConvertX-CN/issues) 提出需求或直接發送 Pull Request。
