# OCR 語言擴展指南

ConvertX-CN 預設內建 7 種 OCR 語言（+ 自動多語言模式），但你可以透過多種方式擴展支援更多語言。

---

## 內建語言

以下語言已預先安裝，無需額外配置：

| 語言     | Tesseract 代碼 | UI 格式代碼 |
| -------- | -------------- | ----------- |
| 英文     | `eng`          | `pdf-en`    |
| 繁體中文 | `chi_tra`      | `pdf-zh-TW` |
| 簡體中文 | `chi_sim`      | `pdf-zh`    |
| 日文     | `jpn`          | `pdf-ja`    |
| 韓文     | `kor`          | `pdf-ko`    |
| 德文     | `deu`          | `pdf-de`    |
| 法文     | `fra`          | `pdf-fr`    |

另外還有 `pdf-ocr` 自動多語言模式，會同時使用所有已安裝的語言包。

---

## 擴展方法比較

| 方法                        | 優點                   | 缺點               | 適用場景       |
| --------------------------- | ---------------------- | ------------------ | -------------- |
| **方法一：compose.yaml**    | 簡單、無需建立額外檔案 | 每次啟動需重新安裝 | 測試、臨時使用 |
| **方法二：掛載語言包**      | 離線可用、啟動快       | 需手動下載檔案     | 離線環境       |
| **方法三：自訂 Dockerfile** | 一次安裝、啟動最快     | 需要建立自訂 image | 生產環境       |

---

## 方法一：透過 compose.yaml 安裝

### 完整範例

```yaml
# compose.yaml
services:
  convertx:
    image: ghcr.io/cysk003/convertx-cn:latest
    container_name: convertx-cn
    restart: unless-stopped

    # 使用自訂 entrypoint 安裝額外語言包
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        echo "📦 正在安裝額外 OCR 語言包..."
        apt-get update && apt-get install -y --no-install-recommends \
          tesseract-ocr-spa \
          tesseract-ocr-ita \
          tesseract-ocr-por \
          tesseract-ocr-rus \
        && rm -rf /var/lib/apt/lists/*
        echo "✅ 語言包安裝完成"
        echo "🚀 啟動 ConvertX..."
        exec bun run start

    ports:
      - "3000:3000"

    volumes:
      - ./data:/app/data

    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=請改成你自己的長隨機字串-至少32個字元
      - ACCOUNT_REGISTRATION=true
      - HTTP_ALLOWED=true
      - ALLOW_UNAUTHENTICATED=false
      - AUTO_DELETE_EVERY_N_HOURS=24
```

### 說明

1. `entrypoint` 和 `command` 覆蓋了原本的啟動命令
2. 在啟動應用前先執行 `apt-get install` 安裝語言包
3. `exec bun run start` 確保應用正確啟動並接收信號

### 注意事項

> ⚠️ **每次容器重啟都會重新安裝語言包**，首次啟動可能需要 1-2 分鐘。

> 💡 如果需要更快的啟動速度，請使用方法二或方法三。

---

## 方法二：掛載語言包（推薦離線環境）

### 步驟 1：下載語言包

```bash
# 建立 tessdata 目錄
mkdir -p tessdata
cd tessdata

# 下載需要的語言包
# 高精度版（推薦，檔案較大）
wget https://github.com/tesseract-ocr/tessdata_best/raw/main/spa.traineddata  # 西班牙文
wget https://github.com/tesseract-ocr/tessdata_best/raw/main/ita.traineddata  # 義大利文
wget https://github.com/tesseract-ocr/tessdata_best/raw/main/por.traineddata  # 葡萄牙文
wget https://github.com/tesseract-ocr/tessdata_best/raw/main/rus.traineddata  # 俄文

# 或使用標準版（檔案較小，速度較快）
# wget https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata
```

### 步驟 2：配置 compose.yaml

```yaml
# compose.yaml
services:
  convertx:
    image: ghcr.io/cysk003/convertx-cn:latest
    container_name: convertx-cn
    restart: unless-stopped

    ports:
      - "3000:3000"

    volumes:
      - ./data:/app/data
      # 掛載語言包目錄
      - ./tessdata:/usr/share/tesseract-ocr/5/tessdata:ro

    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=請改成你自己的長隨機字串-至少32個字元
```

### 目錄結構

```
your-project/
├── compose.yaml
├── data/
└── tessdata/
    ├── spa.traineddata
    ├── ita.traineddata
    ├── por.traineddata
    └── rus.traineddata
```

### 語言包下載來源

| 版本     | 說明                 | 下載位置                                       |
| -------- | -------------------- | ---------------------------------------------- |
| 高精度版 | 辨識準確度最高       | https://github.com/tesseract-ocr/tessdata_best |
| 標準版   | 平衡準確度與速度     | https://github.com/tesseract-ocr/tessdata      |
| 快速版   | 速度最快，準確度較低 | https://github.com/tesseract-ocr/tessdata_fast |

---

## 方法三：自訂 Dockerfile（推薦生產環境）

### 步驟 1：建立 Dockerfile

```dockerfile
# Dockerfile
FROM ghcr.io/cysk003/convertx-cn:latest

# 安裝額外 OCR 語言包
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr-spa \
    tesseract-ocr-ita \
    tesseract-ocr-por \
    tesseract-ocr-rus \
    tesseract-ocr-ara \
    tesseract-ocr-hin \
    tesseract-ocr-vie \
    tesseract-ocr-tha \
  && rm -rf /var/lib/apt/lists/*

# 可選：驗證安裝
RUN tesseract --list-langs
```

### 步驟 2：配置 compose.yaml

```yaml
# compose.yaml
services:
  convertx:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: convertx-cn
    restart: unless-stopped

    ports:
      - "3000:3000"

    volumes:
      - ./data:/app/data

    environment:
      - TZ=Asia/Taipei
      - JWT_SECRET=請改成你自己的長隨機字串-至少32個字元
```

### 步驟 3：建置並啟動

```bash
# 建置自訂 image
docker compose build

# 啟動
docker compose up -d
```

### 目錄結構

```
your-project/
├── compose.yaml
├── Dockerfile
└── data/
```

---

## 可用語言包完整列表

### 常用語言

| Tesseract 包名      | 語言代碼 | 語言     | 檔案大小（約） |
| ------------------- | -------- | -------- | -------------- |
| `tesseract-ocr-spa` | es       | 西班牙文 | 5 MB           |
| `tesseract-ocr-ita` | it       | 義大利文 | 4 MB           |
| `tesseract-ocr-por` | pt       | 葡萄牙文 | 4 MB           |
| `tesseract-ocr-rus` | ru       | 俄文     | 6 MB           |
| `tesseract-ocr-ara` | ar       | 阿拉伯文 | 3 MB           |
| `tesseract-ocr-hin` | hi       | 印地文   | 7 MB           |
| `tesseract-ocr-vie` | vi       | 越南文   | 2 MB           |
| `tesseract-ocr-tha` | th       | 泰文     | 5 MB           |

### 歐洲語言

| Tesseract 包名      | 語言代碼 | 語言         |
| ------------------- | -------- | ------------ |
| `tesseract-ocr-swe` | sv       | 瑞典文       |
| `tesseract-ocr-dan` | da       | 丹麥文       |
| `tesseract-ocr-nor` | no       | 挪威文       |
| `tesseract-ocr-fin` | fi       | 芬蘭文       |
| `tesseract-ocr-pol` | pl       | 波蘭文       |
| `tesseract-ocr-ces` | cs       | 捷克文       |
| `tesseract-ocr-hun` | hu       | 匈牙利文     |
| `tesseract-ocr-nld` | nl       | 荷蘭文       |
| `tesseract-ocr-ell` | el       | 希臘文       |
| `tesseract-ocr-ukr` | uk       | 烏克蘭文     |
| `tesseract-ocr-ron` | ro       | 羅馬尼亞文   |
| `tesseract-ocr-bul` | bg       | 保加利亞文   |
| `tesseract-ocr-hrv` | hr       | 克羅地亞文   |
| `tesseract-ocr-slk` | sk       | 斯洛伐克文   |
| `tesseract-ocr-slv` | sl       | 斯洛維尼亞文 |

### 中東語言

| Tesseract 包名      | 語言代碼 | 語言     |
| ------------------- | -------- | -------- |
| `tesseract-ocr-heb` | he       | 希伯來文 |
| `tesseract-ocr-tur` | tr       | 土耳其文 |
| `tesseract-ocr-fas` | fa       | 波斯文   |

### 亞洲語言

| Tesseract 包名      | 語言代碼 | 語言         |
| ------------------- | -------- | ------------ |
| `tesseract-ocr-ben` | bn       | 孟加拉文     |
| `tesseract-ocr-tam` | ta       | 泰米爾文     |
| `tesseract-ocr-tel` | te       | 泰盧固文     |
| `tesseract-ocr-kan` | kn       | 卡納達文     |
| `tesseract-ocr-mal` | ml       | 馬拉雅拉姆文 |
| `tesseract-ocr-mar` | mr       | 馬拉地文     |
| `tesseract-ocr-guj` | gu       | 古吉拉特文   |
| `tesseract-ocr-pan` | pa       | 旁遮普文     |
| `tesseract-ocr-mya` | my       | 緬甸文       |
| `tesseract-ocr-khm` | km       | 高棉文       |
| `tesseract-ocr-lao` | lo       | 寮文         |
| `tesseract-ocr-ind` | id       | 印尼文       |
| `tesseract-ocr-msa` | ms       | 馬來文       |

> 💡 **查詢所有可用語言包**：在容器內執行 `apt-cache search tesseract-ocr-`

---

## 驗證語言包安裝

### 方法 1：在容器內檢查

```bash
# 進入容器
docker exec -it convertx-cn /bin/bash

# 列出已安裝的語言
tesseract --list-langs
```

### 方法 2：透過日誌確認

啟動容器後查看日誌：

```bash
docker compose logs -f convertx
```

如果使用方法一（compose.yaml 安裝），會看到類似以下輸出：

```
📦 正在安裝額外 OCR 語言包...
✅ 語言包安裝完成
🚀 啟動 ConvertX...
```

---

## 常見問題

### Q: 為什麼 UI 上看不到新增的語言選項？

**A:** OCRmyPDF 的 UI 格式是在程式碼中固定的（8 種選項），新增語言包只會影響 `pdf-ocr` 自動模式的辨識能力。如果你使用 `pdf-ocr` 模式，系統會自動使用所有已安裝的語言包。

### Q: 自動模式會變慢嗎？

**A:** 安裝更多語言包後，`pdf-ocr` 自動模式可能會稍微變慢，因為 Tesseract 需要嘗試更多語言。如果你知道文件語言，選擇特定語言格式會更快。

### Q: 如何在 UI 上顯示新的語言選項？

**A:** 需要修改 `src/converters/ocrmypdf.ts` 中的 `SUPPORTED_LANGUAGES` 陣列，並重新建置應用。這超出了簡單配置的範圍。

### Q: 語言包太大，如何減少下載量？

**A:** 使用 `tessdata_fast` 版本而非 `tessdata_best`，或只安裝實際需要的語言。

---

## 相關文件

- [OCR 功能說明](../功能說明/OCR.md)
- [Docker Compose 說明](說明文件.md)
- [compose.ocr-languages.yml](compose.ocr-languages.yml)
- [環境變數設定](../配置設定/環境變數.md)
