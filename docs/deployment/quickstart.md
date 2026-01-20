# 快速部署指南

本文件提供 ConvertX-CN 的完整部署步驟，適合第一次使用 Docker 的使用者。

---

## 前置需求

- [Docker](https://www.docker.com/products/docker-desktop/) 或 [Docker Engine](https://docs.docker.com/engine/install/)
- 約 6 GB 硬碟空間
- 網路連線（首次下載映像檔）

---

## 步驟 1：安裝 Docker

### Windows / macOS

下載並安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

### Linux

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 登出再登入，讓群組生效
```

驗證安裝：

```bash
docker --version
docker compose version
```

---

## 步驟 2：建立專案資料夾

### Linux / macOS

```bash
mkdir -p ~/convertx-cn/data
cd ~/convertx-cn
```

### Windows (PowerShell)

```powershell
mkdir C:\convertx-cn\data
cd C:\convertx-cn
```

> ⚠️ `data` 資料夾必須先建立，否則 Docker 會建立匿名 volume，導致資料難以存取。

---

## 步驟 3：建立 docker-compose.yml

在專案資料夾建立 `docker-compose.yml`：

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
      - JWT_SECRET=請改成你自己的隨機字串至少32字元
```

### 必要參數說明

| 參數         | 說明                               |
| ------------ | ---------------------------------- |
| `./data`     | 存放上傳檔案與轉換結果，必須先建立 |
| `JWT_SECRET` | 登入驗證金鑰，不設會每次重啟被登出 |

---

## 步驟 4：啟動服務

```bash
docker compose up -d
```

首次執行會下載映像檔（約 4-6 GB），需等待幾分鐘。

查看狀態：

```bash
docker compose ps
docker compose logs -f  # Ctrl+C 退出
```

---

## 步驟 5：使用

1. 開啟瀏覽器，訪問 `http://localhost:3000`
2. 點擊 **Register** 註冊帳號
3. 開始轉換檔案

首次註冊的帳號會自動成為管理員。

---

## 常見問題

| 問題                 | 解法                                 |
| -------------------- | ------------------------------------ |
| 登入後又被踢回登入頁 | 加上 `HTTP_ALLOWED=true`             |
| 重啟後資料消失       | 確認 `./data:/app/data` 且資料夾存在 |
| 重啟後被登出         | 設定固定的 `JWT_SECRET`              |
| 3000 埠被佔用        | 改用 `"8080:3000"`                   |

更多問題請參考 [FAQ](../faq.md)。

---

## 下一步

- [環境變數完整說明](../config/environment.md)
- [反向代理與 HTTPS](../deployment.md)
- [版本更新方法](update.md)
