# 版本更新指南

本文件說明如何更新 ConvertX-CN 到新版本。

---

## 使用 Docker Compose 更新

### 更新到最新版

```bash
# 1. 進入專案資料夾
cd ~/convertx-cn

# 2. 停止服務
docker compose down

# 3. 拉取最新映像檔
docker compose pull

# 4. 重新啟動
docker compose up -d
```

### 更新到指定版本

修改 `docker-compose.yml`：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:v0.1.9 # 指定版本
```

然後執行：

```bash
docker compose down
docker compose pull
docker compose up -d
```

---

## 驗證更新

### 查看 Log

```bash
docker compose logs | head -20
```

### 檢查網頁版本

開啟 `http://localhost:3000`，頁面底部會顯示版本號。

### 檢查映像檔版本

```bash
docker images convertx/convertx-cn
```

---

## 備份建議

更新前建議備份 `data` 資料夾：

```bash
# Linux / macOS
cp -r ./data ./data.backup.$(date +%Y%m%d)

# Windows PowerShell
Copy-Item -Recurse .\data .\data.backup.$(Get-Date -Format "yyyyMMdd")
```

---

## 回滾版本

如果新版本有問題，可以回滾到舊版本：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:v0.1.8 # 舊版本
```

```bash
docker compose down
docker compose pull
docker compose up -d
```

---

## 清理舊映像檔

更新後可清理不再使用的舊映像檔，釋放磁碟空間：

```bash
docker image prune -a
```

> ⚠️ 此指令會刪除所有未使用的映像檔，不只是 ConvertX-CN。

只刪除 ConvertX-CN 舊版本：

```bash
# 列出所有版本
docker images convertx/convertx-cn

# 刪除特定版本
docker rmi convertx/convertx-cn:v0.1.7
```

---

## 自動更新（進階）

可使用 [Watchtower](https://containrrr.dev/watchtower/) 自動更新容器：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:latest
    # ... 其他設定

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 # 每 24 小時檢查一次
```

> ⚠️ 自動更新適合測試環境。生產環境建議手動更新，確認新版本穩定後再升級。

---

## 相關文件

- [版本選擇指南](../versions/)
- [GitHub Releases](https://github.com/pi-docket/ConvertX-CN/releases)
- [Changelog](../../CHANGELOG.md)
