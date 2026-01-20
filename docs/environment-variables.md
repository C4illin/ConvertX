# 環境變數設定

本文件列出 ConvertX-CN 所有可用的環境變數設定。

## 快速參考

| 重要程度 | 變數           | 說明             |
| -------- | -------------- | ---------------- |
| 🔴 必填  | `JWT_SECRET`   | 生產環境必須設定 |
| 🟡 建議  | `TZ`           | 時區設定         |
| 🟡 建議  | `HTTP_ALLOWED` | 是否允許 HTTP    |
| 🟢 可選  | 其他           | 依需求設定       |

---

## 🔴 必填設定（生產環境）

### JWT_SECRET

| 項目   | 說明                               |
| ------ | ---------------------------------- |
| 預設值 | `randomUUID()`（每次重啟都會改變） |
| 用途   | 用於簽署 JWT 的密鑰字串            |

**⚠️ 重要**：若不設定，每次容器重啟後所有使用者都需要重新登入。

**產生方式**：

```bash
# Linux / macOS
openssl rand -hex 32

# 輸出範例
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**設定方式**：

```yaml
environment:
  - JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## 🟡 建議設定

### TZ（時區）

| 項目   | 說明                           |
| ------ | ------------------------------ |
| 預設值 | `UTC`                          |
| 用途   | 影響檔案時間戳記與日期顯示格式 |

**常用值**：

| 地區 | 設定值                |
| ---- | --------------------- |
| 台灣 | `Asia/Taipei`         |
| 中國 | `Asia/Shanghai`       |
| 香港 | `Asia/Hong_Kong`      |
| 日本 | `Asia/Tokyo`          |
| 美東 | `America/New_York`    |
| 美西 | `America/Los_Angeles` |
| 英國 | `Europe/London`       |

### HTTP_ALLOWED

| 項目   | 說明                  |
| ------ | --------------------- |
| 預設值 | `false`               |
| 用途   | 是否允許非 HTTPS 連線 |

**設定指南**：

| 情境                           | 設定值  |
| ------------------------------ | ------- |
| 本地測試（http://localhost）   | `true`  |
| 遠端部署且有 HTTPS             | `false` |
| 遠端部署但沒有 HTTPS（不建議） | `true`  |

**⚠️ 常見問題**：若設為 `false` 但實際用 HTTP 存取，會導致「登入後又被導回登入頁」。

### TRUST_PROXY

| 項目   | 說明                                 |
| ------ | ------------------------------------ |
| 預設值 | `false`                              |
| 用途   | 透過 Reverse Proxy 存取時設為 `true` |

讓應用程式信任 `X-Forwarded-Proto` 等 headers，正確判斷連線是否為 HTTPS。

**設定指南**：

| 情境                         | 設定值  |
| ---------------------------- | ------- |
| 直接存取容器（無 Proxy）     | `false` |
| 透過 Nginx / Traefik / Caddy | `true`  |

---

## 🔒 安全性設定

### ACCOUNT_REGISTRATION

| 項目   | 說明               |
| ------ | ------------------ |
| 預設值 | `true`             |
| 用途   | 是否允許註冊新帳號 |

**💡 注意**：首次註冊的帳號不受此限制，即使設為 `false` 仍可建立第一個帳號。

**建議**：

- 首次部署時設為 `true`
- 註冊好管理員帳號後改為 `false`

### ALLOW_UNAUTHENTICATED

| 項目   | 說明                       |
| ------ | -------------------------- |
| 預設值 | `false`                    |
| 用途   | 是否允許未登入使用轉換功能 |

**⚠️ 風險**：設為 `true` 時：

- 任何人都可使用伺服器資源
- 可能被濫用（大量轉換、儲存空間耗盡）

**建議**：除非明確要提供公開服務，否則保持 `false`。

---

## 📁 檔案管理

### AUTO_DELETE_EVERY_N_HOURS

| 項目   | 說明                                  |
| ------ | ------------------------------------- |
| 預設值 | `24`                                  |
| 用途   | 自動刪除超過 N 小時的檔案（0 = 停用） |

**範例**：

```yaml
# 每 48 小時清理一次
- AUTO_DELETE_EVERY_N_HOURS=48

# 停用自動清理（不建議，會佔滿磁碟）
- AUTO_DELETE_EVERY_N_HOURS=0
```

---

## 🎨 介面設定

### WEBROOT

| 項目   | 說明                         |
| ------ | ---------------------------- |
| 預設值 | (空)                         |
| 用途   | 子路徑部署，例如 `/convertx` |

若透過子路徑存取（如 `https://example.com/convertx/`）：

```yaml
- WEBROOT=/convertx
```

### HIDE_HISTORY

| 項目   | 說明             |
| ------ | ---------------- |
| 預設值 | `false`          |
| 用途   | 隱藏歷史紀錄頁面 |

### LANGUAGE

| 項目   | 說明                        |
| ------ | --------------------------- |
| 預設值 | `en`                        |
| 用途   | 日期格式語言（BCP 47 格式） |

影響介面上的日期顯示格式（如 2026/01/20 vs 01/20/2026）。

---

## ⚙️ 轉換設定

### MAX_CONVERT_PROCESS

| 項目   | 說明                         |
| ------ | ---------------------------- |
| 預設值 | `0`                          |
| 用途   | 最大同時轉換數（0 = 無限制） |

限制同時進行的轉換任務數量，避免伺服器過載。

### FFMPEG_ARGS

| 項目   | 說明                            |
| ------ | ------------------------------- |
| 預設值 | (空)                            |
| 用途   | FFmpeg 輸入參數，用於硬體加速等 |

**硬體加速範例**：

```yaml
# NVIDIA GPU
- FFMPEG_ARGS=-hwaccel cuda

# Intel QSV
- FFMPEG_ARGS=-hwaccel qsv

# AMD VAAPI
- FFMPEG_ARGS=-hwaccel vaapi
```

### FFMPEG_OUTPUT_ARGS

| 項目   | 說明            |
| ------ | --------------- |
| 預設值 | (空)            |
| 用途   | FFmpeg 輸出參數 |

```yaml
# 使用較快的編碼預設
- FFMPEG_OUTPUT_ARGS=-preset veryfast
```

---

## 🔧 進階設定

### UNAUTHENTICATED_USER_SHARING

| 項目   | 說明                         |
| ------ | ---------------------------- |
| 預設值 | `false`                      |
| 用途   | 未登入使用者是否共享檔案空間 |

設為 `true` 時，所有匿名使用者會看到相同的檔案。

---

## 情境範例

### 開發環境

```yaml
environment:
  - HTTP_ALLOWED=true
  - ACCOUNT_REGISTRATION=true
  - TZ=Asia/Taipei
```

### 生產環境

```yaml
environment:
  - JWT_SECRET=your-very-long-and-random-secret-key-change-me
  - ACCOUNT_REGISTRATION=false
  - HTTP_ALLOWED=false
  - TRUST_PROXY=true
  - TZ=Asia/Taipei
  - AUTO_DELETE_EVERY_N_HOURS=24
```

### 公開服務（允許匿名使用）

```yaml
environment:
  - ALLOW_UNAUTHENTICATED=true
  - HIDE_HISTORY=true
  - AUTO_DELETE_EVERY_N_HOURS=1
```

---

## 相關文件

- [進階部署指南](deployment.md)
- [Docker Compose 範例](docker-compose/)
- [常見問題](faq.md)

### 帶硬體加速

```yaml
environment:
  - JWT_SECRET=your-secret-key
  - FFMPEG_ARGS=-hwaccel cuda
  - FFMPEG_OUTPUT_ARGS=-c:v h264_nvenc -preset fast
```
