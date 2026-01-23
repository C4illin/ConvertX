# 快速開始

> ⚠️ **此文件已遷移**
>
> 本文件內容已整合至新的文件結構，請參閱：
>
> - 📖 [概覽](快速入門/概覽.md)
> - 🚀 [快速開始](快速入門/快速開始.md)
> - ❓ [常見問題](快速入門/常見問題.md)
>
> 此文件將在未來版本中移除。

---

> 本文件提供完整部署步驟。若只需最快啟動，請參考 [README](../README.md)。

---

## 系統需求

| 需求     | 最低   | 建議   |
| -------- | ------ | ------ |
| Docker   | 20.10+ | 24.0+  |
| RAM      | 4 GB   | 8 GB   |
| 磁碟空間 | 10 GB  | 20 GB  |
| CPU      | 2 核心 | 4 核心 |

---

## 事前準備

建立資料夾（重要）：

```bash
mkdir -p ~/convertx-cn/data && cd ~/convertx-cn
```

> `data` 資料夾是主機上的實體資料夾，用於存放上傳檔案與轉換結果。

---

## 最快方式：Docker Run

```bash
docker run -d \
  --name convertx-cn \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e TZ=Asia/Taipei \
  -e JWT_SECRET=你的隨機字串至少32字元 \
  convertx/convertx-cn:latest
```

開啟瀏覽器訪問 `http://localhost:3000`：

1. 點擊右上角 **Register** 註冊帳號
2. 輸入 Email 和密碼
3. 完成！開始使用

---

## 推薦方式：Docker Compose

### 1. 建立配置檔

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
      - HTTP_ALLOWED=false
      - AUTO_DELETE_EVERY_N_HOURS=24
```

### 2. 啟動服務

```bash
docker compose up -d
```

### 3. 開始使用

1. 開啟瀏覽器訪問 `http://localhost:3000`
2. 點擊「Register」建立帳號
3. 登入後即可開始轉換檔案！

---

## 首次設定

### 建立管理員帳號

首次訪問時，ConvertX-CN 會顯示設定頁面，讓您建立第一個帳號。此帳號即為管理員。

### 註冊功能

- `ACCOUNT_REGISTRATION=true`：允許其他人註冊
- `ACCOUNT_REGISTRATION=false`：停用註冊（單人使用）

---

## 驗證安裝

### 檢查容器狀態

```bash
docker ps
# 應該看到 convertx-cn 容器正在運行

docker logs convertx-cn
# 應該看到 "🦊 Elysia is running at http://localhost:3000"
```

### 健康檢查

```bash
curl http://localhost:3000/healthcheck
# 應該返回 "OK"
```

---

## 更新版本

```bash
# Docker Compose
docker compose pull
docker compose up -d

# 或 Docker Run
docker pull convertx/convertx-cn:latest
docker stop convertx-cn
docker rm convertx-cn
# 然後重新執行 docker run 指令
```

---

## 常見問題

### 無法訪問頁面

1. 確認容器正在運行：`docker ps`
2. 檢查連接埠是否被占用：`netstat -an | grep 3000`
3. 查看錯誤日誌：`docker logs convertx-cn`

### 權限錯誤

```bash
# 確保 data 目錄有正確權限
chmod -R 777 ./data
```

### 記憶體不足

ConvertX-CN 內建完整依賴，建議至少 4GB RAM。可透過 Docker 限制記憶體使用：

```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

---

## 下一步

- 📖 [Docker 配置](docker.md) - 進階 Docker 設定
- ⚙️ [環境變數](environment-variables.md) - 所有可用設定
- 🔧 [進階用法](advanced-usage.md) - 硬體加速、反向代理
- 🌍 [多語言](i18n.md) - 語言設定與自訂
