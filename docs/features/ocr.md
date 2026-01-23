# OCR 功能

ConvertX-CN 內建 Tesseract OCR，可將圖片中的文字轉換為可編輯文字。

---

## 內建語言

ConvertX-CN 完整版內建以下 OCR 語言：

| 語言     | 代碼      |
| -------- | --------- |
| 繁體中文 | `chi_tra` |
| 簡體中文 | `chi_sim` |
| 英文     | `eng`     |
| 日文     | `jpn`     |
| 韓文     | `kor`     |
| 德文     | `deu`     |
| 法文     | `fra`     |

---

## 使用方式

### 圖片 → 文字

1. 上傳圖片（PNG, JPG, TIFF 等）
2. 選擇目標格式 `txt` 或 `pdf`（可搜尋）
3. 進行轉換

### PDF → 可搜尋 PDF

1. 上傳掃描版 PDF
2. 選擇 OCR 處理
3. 獲得可搜尋的 PDF

---

## 支援的輸入格式

- **點陣圖**：PNG, JPG, JPEG, TIFF, BMP, GIF
- **文件**：PDF（掃描版）
- **其他**：WebP, PNM, PBM

---

## 輸出格式

| 格式 | 說明            |
| ---- | --------------- |
| TXT  | 純文字          |
| PDF  | 可搜尋 PDF      |
| HOCR | HTML + 座標資訊 |

---

## 最佳實踐

### 提高辨識準確度

1. **解析度**：至少 300 DPI
2. **對比度**：文字與背景對比清晰
3. **傾斜校正**：確保文字水平
4. **雜訊去除**：去除背景雜訊

### 處理多語言文件

Tesseract 可同時辨識多種語言，但準確度可能下降。

建議：

- 單一語言文件使用單一語言包
- 中英混合使用 `chi_tra+eng`

---

## 新增語言

### 方法一：自訂 Dockerfile

```dockerfile
# 在 Dockerfile.full 中取消註解
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr-spa \  # 西班牙文
  tesseract-ocr-ita \  # 義大利文
  && rm -rf /var/lib/apt/lists/*
```

### 方法二：掛載語言包

```yaml
volumes:
  - ./tessdata:/usr/share/tesseract-ocr/5/tessdata
```

下載語言包：https://github.com/tesseract-ocr/tessdata_best

---

## 可選語言包

| 區域   | 語言                           |
| ------ | ------------------------------ |
| 西歐   | 西班牙文、義大利文、葡萄牙文   |
| 北歐   | 瑞典文、丹麥文、挪威文、芬蘭文 |
| 東歐   | 俄文、波蘭文、捷克文、匈牙利文 |
| 中東   | 阿拉伯文、希伯來文、土耳其文   |
| 南亞   | 印地文、孟加拉文、泰米爾文     |
| 東南亞 | 泰文、越南文、印尼文           |

---

## 相關文件

- [支援的轉換器](converters.md)
- [翻譯功能](translation.md)
- [Docker 部署](../deployment/docker.md)
