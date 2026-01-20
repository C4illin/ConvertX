# Docker Compose 範例檔案

本資料夾提供不同情境的 Docker Compose 範例。

## 範例檔案

| 檔案                                             | 適用情境    | 說明                      |
| ------------------------------------------------ | ----------- | ------------------------- |
| [compose.minimal.yml](compose.minimal.yml)       | Docker 老手 | 最精簡的可用配置          |
| [compose.production.yml](compose.production.yml) | 生產環境    | 含 Reverse Proxy 設定說明 |
| [compose.reference.yml](compose.reference.yml)   | 參考文件    | 所有可用設定的完整參考    |

## 如何使用

### 方式 1：直接使用範例檔案

```bash
# 下載範例
curl -O https://raw.githubusercontent.com/pi-docket/ConvertX-CN/main/docs/docker-compose/compose.minimal.yml

# 重命名為 docker-compose.yml
mv compose.minimal.yml docker-compose.yml

# 建立 data 資料夾
mkdir -p data

# 修改設定（至少要改 JWT_SECRET）
nano docker-compose.yml

# 啟動
docker compose up -d
```

### 方式 2：複製內容

1. 點擊上方檔案連結
2. 複製內容
3. 貼到你的 `docker-compose.yml`
4. 修改必要設定
5. 執行 `docker compose up -d`

## 選擇指南

### 我是新手

請直接使用 [README 主頁](../../README.md) 的教學版範例。

### 我熟悉 Docker

使用 [compose.minimal.yml](compose.minimal.yml)，只需修改 `JWT_SECRET`。

### 我要部署到正式環境

使用 [compose.production.yml](compose.production.yml)，包含：

- Reverse Proxy 設定說明
- 安全性設定建議
- HTTPS 配置範例

### 我想了解所有設定

參考 [compose.reference.yml](compose.reference.yml)，包含所有環境變數的說明。

## 相關文件

- [環境變數完整說明](../environment-variables.md)
- [進階部署指南](../deployment.md)
- [Docker 進階配置](../docker.md)
