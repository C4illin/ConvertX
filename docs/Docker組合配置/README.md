# Docker Compose 範例檔案

本資料夾提供不同情境的 Docker Compose 範例。

## 範例檔案

| 檔案                                             | 適用情境    | 說明                  |
| ------------------------------------------------ | ----------- | --------------------- |
| [compose.minimal.yml](compose.minimal.yml)       | Docker 老手 | 最精簡的可用配置      |
| [compose.production.yml](compose.production.yml) | 生產環境    | 含 Reverse Proxy 設定 |
| [compose.reference.yml](compose.reference.yml)   | 參考文件    | 所有設定的完整參考    |

## 快速選擇

| 你是...      | 使用                          |
| ------------ | ----------------------------- |
| 新手         | [README 主頁](../說明文件.md) |
| Docker 熟手  | compose.minimal.yml           |
| 生產環境     | compose.production.yml        |
| 查詢所有選項 | compose.reference.yml         |

## 如何使用

```bash
# 下載範例
curl -O https://raw.githubusercontent.com/pi-docket/ConvertX-CN/main/docs/docker-compose/compose.minimal.yml

# 重命名
mv compose.minimal.yml docker-compose.yml

# 建立 data 資料夾
mkdir -p data

# 修改 JWT_SECRET
nano docker-compose.yml

# 啟動
docker compose up -d
```

## 相關文件

- [Docker Compose 詳解](../部署指南/Docker組合.md)
- [環境變數說明](../配置設定/環境變數.md)
- [版本選擇指南](../版本/)

### 我要部署到正式環境

使用 [compose.production.yml](compose.production.yml)，包含：

- Reverse Proxy 設定說明
- 安全性設定建議
- HTTPS 配置範例

### 我想了解所有設定

參考 [compose.reference.yml](compose.reference.yml)，包含所有環境變數的說明。

## 相關文件

- [環境變數完整說明](../配置設定/環境變數.md)
- [Docker 部署指南](../部署指南/Docker部署.md)
- [反向代理設定](../部署指南/反向代理.md)
