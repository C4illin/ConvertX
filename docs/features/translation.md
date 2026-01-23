# 翻譯功能

ConvertX-CN 內建 PDFMathTranslate 引擎，可翻譯 PDF 同時保留數學公式與排版。

---

## 功能特色

- 📊 **保留數學公式**：LaTeX 公式完整保留
- 📈 **保留圖表**：圖片、表格位置不變
- 📑 **保留目錄**：連結與結構完整
- 🌐 **多語言支援**：15+ 種目標語言

---

## 支援的目標語言

| 格式代碼    | 目標語言 |
| ----------- | -------- |
| `pdf-en`    | 英文     |
| `pdf-zh`    | 簡體中文 |
| `pdf-zh-TW` | 繁體中文 |
| `pdf-ja`    | 日文     |
| `pdf-ko`    | 韓文     |
| `pdf-de`    | 德文     |
| `pdf-fr`    | 法文     |
| `pdf-es`    | 西班牙文 |
| `pdf-it`    | 義大利文 |
| `pdf-pt`    | 葡萄牙文 |
| `pdf-ru`    | 俄文     |
| `pdf-ar`    | 阿拉伯文 |
| `pdf-hi`    | 印地文   |
| `pdf-vi`    | 越南文   |
| `pdf-th`    | 泰文     |

---

## 使用方式

1. 上傳 PDF 檔案
2. 在目標格式選擇 `pdf-zh-TW`（或其他語言）
3. 點擊轉換
4. 下載翻譯後的 PDF

---

## 輸出格式

所有輸出一律打包為 `.tar` 檔案，包含：

```
output.tar
├── original.pdf      # 原始 PDF
└── translated-*.pdf  # 翻譯後的 PDF
```

---

## 環境變數設定

### PDFMATHTRANSLATE_SERVICE

選擇翻譯服務提供商。

| 值       | 說明                |
| -------- | ------------------- |
| `google` | Google 翻譯（預設） |
| `deepl`  | DeepL 翻譯          |
| `openai` | OpenAI API          |
| `azure`  | Azure Translator    |

```yaml
environment:
  - PDFMATHTRANSLATE_SERVICE=google
```

### 使用付費服務

如需使用 DeepL 或 OpenAI 等付費服務，需設定 API Key：

```yaml
environment:
  - PDFMATHTRANSLATE_SERVICE=openai
  - OPENAI_API_KEY=sk-xxxxx
```

---

## 適用場景

### ✅ 適合

- 學術論文翻譯
- 數學/物理教科書
- 技術文件翻譯
- AI/ML 論文

### ⚠️ 限制

- 掃描版 PDF（需先 OCR）
- 複雜排版的雜誌
- 手寫文件

---

## 注意事項

1. **模型已預載**：所需模型已在 Docker build 階段下載
2. **不會隱式下載**：Runtime 不會下載額外模型
3. **預設免費服務**：使用 Google 翻譯（免費）

---

## 相關文件

- [支援的轉換器](converters.md)
- [OCR 功能](ocr.md)
- [環境變數設定](../configuration/environment-variables.md)
