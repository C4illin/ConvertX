# PDF Packager — 多功能 PDF 處理引擎

## 概覽

**PDF Packager** 是 ConvertX-CN 的一個獨立引擎，專門處理 PDF 檔案的多種輸出格式轉換。使用者只需上傳 PDF，選擇一個 chip（輸出選項），即可產生對應的最終檔案。

## 功能特點

- 🖼️ **圖片輸出**：將 PDF 頁面轉換為 PNG/JPG/JPEG 圖片並打包
- 📄 **圖片型 PDF**：將 PDF 轉換為純圖片組成的 PDF
- 📋 **PDF/A 標準**：轉換為長期保存標準的 PDF/A-1b 或 PDF/A-2b
- 🔒 **權限保護**：設定列印/修改權限（無密碼）
- ✍️ **數位簽章**：支援 PDF 數位簽章（可插拔介面）
- 📦 **批次打包**：`all-*` 選項一次產生所有常用輸出

---

## Chip 命名規則

### 基本語法

```
<類型>-<DPI>[-<保護>][-s]
```

### DPI 選項

| DPI | 說明                       |
| --- | -------------------------- |
| 150 | 低解析度（適合網頁預覽）   |
| 300 | 標準解析度（適合一般用途） |
| 600 | 高解析度（適合印刷品質）   |

### 保護選項

| 標記 | 說明               |
| ---- | ------------------ |
| `p`  | 允許列印，禁止修改 |
| `np` | 禁止列印，禁止修改 |

### 簽章選項

| 標記 | 說明         |
| ---- | ------------ |
| `s`  | 套用數位簽章 |

---

## 所有可用的 Chips（完整清單）

### A 圖片輸出（打包為 .tar）

| Chip       | 說明         | 輸出檔案            |
| ---------- | ------------ | ------------------- |
| `png-150`  | PNG 150 DPI  | `pack_png-150.tar`  |
| `png-300`  | PNG 300 DPI  | `pack_png-300.tar`  |
| `png-600`  | PNG 600 DPI  | `pack_png-600.tar`  |
| `jpg-150`  | JPG 150 DPI  | `pack_jpg-150.tar`  |
| `jpg-300`  | JPG 300 DPI  | `pack_jpg-300.tar`  |
| `jpg-600`  | JPG 600 DPI  | `pack_jpg-600.tar`  |
| `jpeg-150` | JPEG 150 DPI | `pack_jpeg-150.tar` |
| `jpeg-300` | JPEG 300 DPI | `pack_jpeg-300.tar` |
| `jpeg-600` | JPEG 600 DPI | `pack_jpeg-600.tar` |

### B 圖片型 PDF

| Chip           | 說明              | 輸出檔案                |
| -------------- | ----------------- | ----------------------- |
| `pdf-150`      | 圖片 PDF 150 DPI  | `pack_pdf-150.pdf`      |
| `pdf-300`      | 圖片 PDF 300 DPI  | `pack_pdf-300.pdf`      |
| `pdf-600`      | 圖片 PDF 600 DPI  | `pack_pdf-600.pdf`      |
| `pdf-150-p`    | + 可列印          | `pack_pdf-150-p.pdf`    |
| `pdf-150-np`   | + 不可列印        | `pack_pdf-150-np.pdf`   |
| `pdf-300-p`    | + 可列印          | `pack_pdf-300-p.pdf`    |
| `pdf-300-np`   | + 不可列印        | `pack_pdf-300-np.pdf`   |
| `pdf-600-p`    | + 可列印          | `pack_pdf-600-p.pdf`    |
| `pdf-600-np`   | + 不可列印        | `pack_pdf-600-np.pdf`   |
| `pdf-150-s`    | + 簽章            | `pack_pdf-150-s.pdf`    |
| `pdf-300-s`    | + 簽章            | `pack_pdf-300-s.pdf`    |
| `pdf-600-s`    | + 簽章            | `pack_pdf-600-s.pdf`    |
| `pdf-150-p-s`  | + 可列印 + 簽章   | `pack_pdf-150-p-s.pdf`  |
| `pdf-150-np-s` | + 不可列印 + 簽章 | `pack_pdf-150-np-s.pdf` |
| `pdf-300-p-s`  | + 可列印 + 簽章   | `pack_pdf-300-p-s.pdf`  |
| `pdf-300-np-s` | + 不可列印 + 簽章 | `pack_pdf-300-np-s.pdf` |
| `pdf-600-p-s`  | + 可列印 + 簽章   | `pack_pdf-600-p-s.pdf`  |
| `pdf-600-np-s` | + 不可列印 + 簽章 | `pack_pdf-600-np-s.pdf` |

### C PDF/A-1b

#### 來源 `i`（從圖片轉換）

| Chip                | 說明                    | 輸出檔案                     |
| ------------------- | ----------------------- | ---------------------------- |
| `pdfa1b-i-150`      | PDF/A-1b 從圖片 150 DPI | `pack_pdfa1b-i-150.pdf`      |
| `pdfa1b-i-300`      | PDF/A-1b 從圖片 300 DPI | `pack_pdfa1b-i-300.pdf`      |
| `pdfa1b-i-600`      | PDF/A-1b 從圖片 600 DPI | `pack_pdfa1b-i-600.pdf`      |
| `pdfa1b-i-150-p`    | + 可列印                | `pack_pdfa1b-i-150-p.pdf`    |
| `pdfa1b-i-150-np`   | + 不可列印              | `pack_pdfa1b-i-150-np.pdf`   |
| `pdfa1b-i-300-p`    | + 可列印                | `pack_pdfa1b-i-300-p.pdf`    |
| `pdfa1b-i-300-np`   | + 不可列印              | `pack_pdfa1b-i-300-np.pdf`   |
| `pdfa1b-i-600-p`    | + 可列印                | `pack_pdfa1b-i-600-p.pdf`    |
| `pdfa1b-i-600-np`   | + 不可列印              | `pack_pdfa1b-i-600-np.pdf`   |
| `pdfa1b-i-150-s`    | + 簽章                  | `pack_pdfa1b-i-150-s.pdf`    |
| `pdfa1b-i-300-s`    | + 簽章                  | `pack_pdfa1b-i-300-s.pdf`    |
| `pdfa1b-i-600-s`    | + 簽章                  | `pack_pdfa1b-i-600-s.pdf`    |
| `pdfa1b-i-150-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-i-150-p-s.pdf`  |
| `pdfa1b-i-150-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-i-150-np-s.pdf` |
| `pdfa1b-i-300-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-i-300-p-s.pdf`  |
| `pdfa1b-i-300-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-i-300-np-s.pdf` |
| `pdfa1b-i-600-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-i-600-p-s.pdf`  |
| `pdfa1b-i-600-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-i-600-np-s.pdf` |

#### 來源 `o`（從原始 PDF 轉換）

| Chip                | 說明                    | 輸出檔案                     |
| ------------------- | ----------------------- | ---------------------------- |
| `pdfa1b-o-150`      | PDF/A-1b 從原始 150 DPI | `pack_pdfa1b-o-150.pdf`      |
| `pdfa1b-o-300`      | PDF/A-1b 從原始 300 DPI | `pack_pdfa1b-o-300.pdf`      |
| `pdfa1b-o-600`      | PDF/A-1b 從原始 600 DPI | `pack_pdfa1b-o-600.pdf`      |
| `pdfa1b-o-150-p`    | + 可列印                | `pack_pdfa1b-o-150-p.pdf`    |
| `pdfa1b-o-150-np`   | + 不可列印              | `pack_pdfa1b-o-150-np.pdf`   |
| `pdfa1b-o-300-p`    | + 可列印                | `pack_pdfa1b-o-300-p.pdf`    |
| `pdfa1b-o-300-np`   | + 不可列印              | `pack_pdfa1b-o-300-np.pdf`   |
| `pdfa1b-o-600-p`    | + 可列印                | `pack_pdfa1b-o-600-p.pdf`    |
| `pdfa1b-o-600-np`   | + 不可列印              | `pack_pdfa1b-o-600-np.pdf`   |
| `pdfa1b-o-150-s`    | + 簽章                  | `pack_pdfa1b-o-150-s.pdf`    |
| `pdfa1b-o-300-s`    | + 簽章                  | `pack_pdfa1b-o-300-s.pdf`    |
| `pdfa1b-o-600-s`    | + 簽章                  | `pack_pdfa1b-o-600-s.pdf`    |
| `pdfa1b-o-150-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-o-150-p-s.pdf`  |
| `pdfa1b-o-150-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-o-150-np-s.pdf` |
| `pdfa1b-o-300-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-o-300-p-s.pdf`  |
| `pdfa1b-o-300-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-o-300-np-s.pdf` |
| `pdfa1b-o-600-p-s`  | + 可列印 + 簽章         | `pack_pdfa1b-o-600-p-s.pdf`  |
| `pdfa1b-o-600-np-s` | + 不可列印 + 簽章       | `pack_pdfa1b-o-600-np-s.pdf` |

### D PDF/A-2b

#### 來源 `i`（從圖片轉換）

| Chip                | 說明                    | 輸出檔案                     |
| ------------------- | ----------------------- | ---------------------------- |
| `pdfa2b-i-150`      | PDF/A-2b 從圖片 150 DPI | `pack_pdfa2b-i-150.pdf`      |
| `pdfa2b-i-300`      | PDF/A-2b 從圖片 300 DPI | `pack_pdfa2b-i-300.pdf`      |
| `pdfa2b-i-600`      | PDF/A-2b 從圖片 600 DPI | `pack_pdfa2b-i-600.pdf`      |
| `pdfa2b-i-150-p`    | + 可列印                | `pack_pdfa2b-i-150-p.pdf`    |
| `pdfa2b-i-150-np`   | + 不可列印              | `pack_pdfa2b-i-150-np.pdf`   |
| `pdfa2b-i-300-p`    | + 可列印                | `pack_pdfa2b-i-300-p.pdf`    |
| `pdfa2b-i-300-np`   | + 不可列印              | `pack_pdfa2b-i-300-np.pdf`   |
| `pdfa2b-i-600-p`    | + 可列印                | `pack_pdfa2b-i-600-p.pdf`    |
| `pdfa2b-i-600-np`   | + 不可列印              | `pack_pdfa2b-i-600-np.pdf`   |
| `pdfa2b-i-150-s`    | + 簽章                  | `pack_pdfa2b-i-150-s.pdf`    |
| `pdfa2b-i-300-s`    | + 簽章                  | `pack_pdfa2b-i-300-s.pdf`    |
| `pdfa2b-i-600-s`    | + 簽章                  | `pack_pdfa2b-i-600-s.pdf`    |
| `pdfa2b-i-150-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-i-150-p-s.pdf`  |
| `pdfa2b-i-150-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-i-150-np-s.pdf` |
| `pdfa2b-i-300-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-i-300-p-s.pdf`  |
| `pdfa2b-i-300-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-i-300-np-s.pdf` |
| `pdfa2b-i-600-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-i-600-p-s.pdf`  |
| `pdfa2b-i-600-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-i-600-np-s.pdf` |

#### 來源 `o`（從原始 PDF 轉換）

| Chip                | 說明                    | 輸出檔案                     |
| ------------------- | ----------------------- | ---------------------------- |
| `pdfa2b-o-150`      | PDF/A-2b 從原始 150 DPI | `pack_pdfa2b-o-150.pdf`      |
| `pdfa2b-o-300`      | PDF/A-2b 從原始 300 DPI | `pack_pdfa2b-o-300.pdf`      |
| `pdfa2b-o-600`      | PDF/A-2b 從原始 600 DPI | `pack_pdfa2b-o-600.pdf`      |
| `pdfa2b-o-150-p`    | + 可列印                | `pack_pdfa2b-o-150-p.pdf`    |
| `pdfa2b-o-150-np`   | + 不可列印              | `pack_pdfa2b-o-150-np.pdf`   |
| `pdfa2b-o-300-p`    | + 可列印                | `pack_pdfa2b-o-300-p.pdf`    |
| `pdfa2b-o-300-np`   | + 不可列印              | `pack_pdfa2b-o-300-np.pdf`   |
| `pdfa2b-o-600-p`    | + 可列印                | `pack_pdfa2b-o-600-p.pdf`    |
| `pdfa2b-o-600-np`   | + 不可列印              | `pack_pdfa2b-o-600-np.pdf`   |
| `pdfa2b-o-150-s`    | + 簽章                  | `pack_pdfa2b-o-150-s.pdf`    |
| `pdfa2b-o-300-s`    | + 簽章                  | `pack_pdfa2b-o-300-s.pdf`    |
| `pdfa2b-o-600-s`    | + 簽章                  | `pack_pdfa2b-o-600-s.pdf`    |
| `pdfa2b-o-150-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-o-150-p-s.pdf`  |
| `pdfa2b-o-150-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-o-150-np-s.pdf` |
| `pdfa2b-o-300-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-o-300-p-s.pdf`  |
| `pdfa2b-o-300-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-o-300-np-s.pdf` |
| `pdfa2b-o-600-p-s`  | + 可列印 + 簽章         | `pack_pdfa2b-o-600-p-s.pdf`  |
| `pdfa2b-o-600-np-s` | + 不可列印 + 簽章       | `pack_pdfa2b-o-600-np-s.pdf` |

### E 全部打包

| Chip      | 說明             | 輸出檔案           |
| --------- | ---------------- | ------------------ |
| `all-150` | 全部格式 150 DPI | `pack_all-150.tar` |
| `all-300` | 全部格式 300 DPI | `pack_all-300.tar` |
| `all-600` | 全部格式 600 DPI | `pack_all-600.tar` |

**`all-*` 包含的輸出：**

- `png-<dpi>.tar`
- `jpg-<dpi>.tar`
- `jpeg-<dpi>.tar`
- `pdf-<dpi>.pdf`
- `pdf-<dpi>-p.pdf`
- `pdf-<dpi>-np.pdf`
- `pdfa1b-i-<dpi>.pdf`
- `pdfa1b-o-<dpi>.pdf`
- `pdfa2b-i-<dpi>.pdf`
- `pdfa2b-o-<dpi>.pdf`

---

## 處理管線（Pipeline）

### 圖片輸出 Pipeline

```
input.pdf
   ↓ pdftoppm (-r <dpi> -<format>)
work/imgs/page-0001.<ext>
work/imgs/page-0002.<ext>
   ...
   ↓ tar (-cf)
out/pack_<chip>.tar
   ↓ cleanup
刪除 work/imgs/*
```

### 圖片型 PDF Pipeline

```
input.pdf
   ↓ pdftoppm (-r <dpi> -png)
work/imgs/page-*.png
   ↓ img2pdf
work/pdf/image_based.pdf
   ↓ [可選] qpdf (權限保護)
work/pdf/protected.pdf
   ↓ [可選] sign (簽章)
work/pdf/signed.pdf
   ↓ copy
out/pack_<chip>.pdf
   ↓ cleanup
刪除 work/imgs/* 和 work/pdf/*
```

### PDF/A Pipeline（來源 i）

```
input.pdf
   ↓ pdftoppm (-r <dpi> -png)
work/imgs/page-*.png
   ↓ img2pdf
work/pdf/image_based.pdf
   ↓ gs (ghostscript, PDF/A-1b 或 2b)
work/pdf/pdfa.pdf
   ↓ [可選] qpdf (權限保護)
work/pdf/protected.pdf
   ↓ [可選] sign (簽章)
work/pdf/signed.pdf
   ↓ copy
out/pack_<chip>.pdf
   ↓ cleanup
刪除 work/imgs/* 和 work/pdf/*
```

### PDF/A Pipeline（來源 o）

```
input.pdf
   ↓ gs (ghostscript, PDF/A-1b 或 2b)
work/pdf/pdfa.pdf
   ↓ [可選] qpdf (權限保護)
work/pdf/protected.pdf
   ↓ [可選] sign (簽章)
work/pdf/signed.pdf
   ↓ copy
out/pack_<chip>.pdf
   ↓ cleanup
刪除 work/pdf/*
```

### all-\* Pipeline

```
input.pdf
   ↓ 依序執行各子 pipeline
out/all/pack_png-<dpi>.tar
out/all/pack_jpg-<dpi>.tar
out/all/pack_jpeg-<dpi>.tar
out/all/pack_pdf-<dpi>.pdf
out/all/pack_pdf-<dpi>-p.pdf
out/all/pack_pdf-<dpi>-np.pdf
out/all/pack_pdfa1b-i-<dpi>.pdf
out/all/pack_pdfa1b-o-<dpi>.pdf
out/all/pack_pdfa2b-i-<dpi>.pdf
out/all/pack_pdfa2b-o-<dpi>.pdf
   ↓ tar (-cf)
out/pack_all-<dpi>.tar
   ↓ cleanup
刪除 out/all/*
```

---

## 權限保護說明

使用 `qpdf` 設定 PDF 權限：

| 選項 | 列印    | 修改    | 密碼 |
| ---- | ------- | ------- | ---- |
| `p`  | ✅ 允許 | ❌ 禁止 | 無   |
| `np` | ❌ 禁止 | ❌ 禁止 | 無   |

---

## 數位簽章

PDF Packager 支援使用 PKCS12 憑證對 PDF 進行數位簽章。簽章功能使用系統內建的 Python `endesive` 庫實現。

### 開箱即用

**無需任何配置！** Docker 映像在建置時已自動產生預設的自簽憑證，可直接使用簽章功能。

預設憑證資訊：

- 📁 路徑：`/app/certs/default.p12`
- 🔑 密碼：無（空密碼）
- 📅 有效期：10 年
- 🏷️ 簽章主體：`CN=PDF Packager Default, O=ConvertX-CN, C=TW`

直接選擇帶有 `-s` 後綴的 chip 即可使用簽章功能，例如：

- `pdf-300-s` - 300 DPI PDF 加簽章
- `pdfa2b-o-300-s` - PDF/A-2b 加簽章

### 使用自訂憑證

如需使用正式憑證（如公司數位憑證、CA 簽發憑證等），可透過環境變數覆蓋預設設定：

```bash
docker run -d \
  -e PDF_SIGN_P12_PATH=/app/certs/my_certificate.p12 \
  -e PDF_SIGN_P12_PASSWORD=your_password \
  -e PDF_SIGN_REASON="文件已核准" \
  -e PDF_SIGN_LOCATION="台北" \
  -e PDF_SIGN_CONTACT="admin@example.com" \
  -v /path/to/your/certs:/app/certs:ro \
  convertx/convertx-cn:latest
```

### 環境變數說明

| 環境變數                | 預設值                     | 說明                |
| ----------------------- | -------------------------- | ------------------- |
| `PDF_SIGN_P12_PATH`     | `/app/certs/default.p12`   | PKCS12 憑證檔案路徑 |
| `PDF_SIGN_P12_PASSWORD` | （空）                     | PKCS12 憑證密碼     |
| `PDF_SIGN_REASON`       | `ConvertX-CN PDF Packager` | 簽章原因            |
| `PDF_SIGN_LOCATION`     | `Taiwan`                   | 簽章地點            |
| `PDF_SIGN_CONTACT`      | `convertx-cn@localhost`    | 聯絡資訊            |

### 產生自訂憑證

如需產生自己的測試憑證：

```bash
# 產生自簽憑證（有效期 365 天）
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/CN=My Company/O=My Organization/C=TW"

# 匯出為 PKCS12 格式
openssl pkcs12 -export \
  -inkey key.pem -in cert.pem \
  -out my_certificate.p12 \
  -passout pass:your_password

# 清理暫存檔
rm key.pem cert.pem
```

> 💡 **提示**：正式環境建議使用經過公認 CA 簽發的憑證，以確保簽章的法律效力。

---

## 工具需求

本引擎需要以下 CLI 工具（皆已內建於 Docker Image）：

| 工具               | 用途         | Docker 安裝狀態 |
| ------------------ | ------------ | --------------- |
| `pdftoppm`         | PDF 轉圖片   | ✅ 已內建       |
| `img2pdf`          | 圖片轉 PDF   | ✅ 已內建       |
| `gs` (Ghostscript) | PDF/A 轉換   | ✅ 已內建       |
| `qpdf`             | PDF 權限保護 | ✅ 已內建       |
| `tar`              | 打包         | ✅ 已內建       |
| `endesive`         | PDF 數位簽章 | ✅ 已內建       |

> 📦 所有工具皆在 Docker build 階段安裝，runtime 不需下載任何軟體。

---

## 錯誤代碼

| 代碼                        | 說明                 |
| --------------------------- | -------------------- |
| `INVALID_CHIP`              | 無效的 chip 名稱     |
| `INVALID_DPI`               | 無效的 DPI 值        |
| `SIGNING_NOT_CONFIGURED`    | 簽章憑證未配置       |
| `SIGNING_CERTIFICATE_ERROR` | 憑證讀取失敗         |
| `SIGNING_ERROR`             | 簽章執行失敗         |
| `PDFTOPPM_ERROR`            | pdftoppm 執行失敗    |
| `IMG2PDF_ERROR`             | img2pdf 執行失敗     |
| `GHOSTSCRIPT_ERROR`         | Ghostscript 執行失敗 |
| `QPDF_ERROR`                | qpdf 執行失敗        |
| `TAR_ERROR`                 | tar 打包失敗         |

---

## 使用範例

### 1. 轉換為 300 DPI PNG 圖片

選擇 chip: `png-300`

結果: 下載 `pack_png-300.tar`，解壓後得到所有頁面的 PNG 圖片。

### 2. 建立不可列印的圖片型 PDF

選擇 chip: `pdf-300-np`

結果: 下載 `pack_pdf-300-np.pdf`，此 PDF 禁止列印和修改。

### 3. 轉換為 PDF/A-2b 標準

選擇 chip: `pdfa2b-o-300`

結果: 下載 `pack_pdfa2b-o-300.pdf`，符合 PDF/A-2b 長期保存標準。

### 4. 一次產生所有格式

選擇 chip: `all-300`

結果: 下載 `pack_all-300.tar`，包含 10 個不同格式的輸出檔案。
