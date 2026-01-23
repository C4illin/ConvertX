# Docker Compose 範例檔案

本資料夾提供不同情境的 Docker Compose 範例。

## 範例檔案

| 檔案                                                                     | 適用情境    | 說明                  |
| ------------------------------------------------------------------------ | ----------- | --------------------- |
| [compose.minimal.yml](compose.minimal.yml)                               | Docker 老手 | 最精簡的可用配置      |
| [compose.production.yml](compose.production.yml)                         | 生產環境    | 含 Reverse Proxy 設定 |
| [compose.production-alt.example.yml](compose.production-alt.example.yml) | 生產環境    | 詳細註解版本          |
| [compose.reference.yml](compose.reference.yml)                           | 參考文件    | 所有設定的完整參考    |
| [compose.ocr-languages.yml](compose.ocr-languages.yml)                   | OCR 擴展    | 安裝額外 OCR 語言包   |
| [OCR語言擴展.md](OCR語言擴展.md)                                         | 詳細指南    | OCR 語言擴展完整說明  |

## 快速選擇

| 你是...           | 使用                                         |
| ----------------- | -------------------------------------------- |
| 新手              | [README 主頁](../說明文件.md)                |
| Docker 熟手       | compose.minimal.yml                          |
| 生產環境          | compose.production.yml                       |
| 查詢所有選項      | compose.reference.yml                        |
| 需要更多 OCR 語言 | [OCR語言擴展.md](OCR語言擴展.md)（詳細指南） |

## 快速開始

### 最小配置

```bash
# 1. 複製範例
cp compose.minimal.yml docker-compose.yml

# 2. 建立資料夾
mkdir -p data

# 3. 修改以下欄位：
#    - JWT_SECRET（至少 32 字元隨機字串）

# 4. 啟動
docker compose up -d
```

### 生產環境

```bash
# 1. 複製範例
cp compose.production.yml docker-compose.yml

# 2. 建立資料夾
mkdir -p data

# 3. 修改以下欄位：
#    - JWT_SECRET（至少 32 字元隨機字串）

# 4. 啟動
docker compose up -d
```

> 💡 產生隨機 JWT_SECRET：`openssl rand -hex 32`

## 相關文件

- [Docker Compose 詳解](../部署指南/Docker組合.md)
- [環境變數說明](../配置設定/環境變數.md)
- [版本選擇指南](../版本/)
- [Docker 部署指南](../部署指南/Docker部署.md)
- [反向代理設定](../部署指南/反向代理.md)

### 我要部署到正式環境

使用 [compose.production.yml](compose.production.yml)，包含：

- Reverse Proxy 設定說明
- 安全性設定建議
- HTTPS 配置範例

### 我想了解所有設定

參考 [compose.reference.yml](compose.reference.yml)，包含所有環境變數的說明。

### 我需要更多 OCR 語言支援

參考 [OCR語言擴展.md](OCR語言擴展.md)，這是完整的 OCR 語言擴展指南，包含：

- 三種擴展方法的詳細說明與比較
- 完整的 compose.yaml 範例配置
- 50+ 種可用語言包列表
- 語言包下載與驗證方法
- 常見問題解答

> 💡 內建 OCR 語言：英文、繁體中文、簡體中文、日文、韓文、德文、法文
>
> 翻譯引擎支援 15 種語言，但 OCR 預設只內建 8 種
