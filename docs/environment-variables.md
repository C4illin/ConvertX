# 環境變數設定

所有環境變數皆為選填，建議至少設定 `JWT_SECRET`。

---

## 安全性設定

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `JWT_SECRET` | `randomUUID()` | 用於簽署 JWT 的密鑰字串。**生產環境請務必設定** |
| `ACCOUNT_REGISTRATION` | `false` | 是否允許註冊新帳號 |
| `HTTP_ALLOWED` | `false` | 是否允許 HTTP 連線（僅本地使用建議開啟） |
| `ALLOW_UNAUTHENTICATED` | `false` | 是否允許未登入使用 |

### 安全建議

```yaml
# 生產環境
environment:
  - JWT_SECRET=a-very-long-random-string-at-least-32-characters
  - ACCOUNT_REGISTRATION=false
  - HTTP_ALLOWED=false
  - ALLOW_UNAUTHENTICATED=false
```

---

## 檔案管理

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `AUTO_DELETE_EVERY_N_HOURS` | `24` | 自動刪除超過 N 小時的檔案（0 = 停用） |

### 範例

```yaml
# 每 48 小時清理一次
- AUTO_DELETE_EVERY_N_HOURS=48

# 停用自動清理
- AUTO_DELETE_EVERY_N_HOURS=0
```

---

## 轉換設定

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `MAX_CONVERT_PROCESS` | `0` | 最大同時轉換數（0 = 無限制） |
| `FFMPEG_ARGS` | - | FFmpeg 輸入參數，例如 `-hwaccel vaapi` |
| `FFMPEG_OUTPUT_ARGS` | - | FFmpeg 輸出參數，例如 `-preset veryfast` |

### 硬體加速範例

```yaml
# NVIDIA GPU 加速
- FFMPEG_ARGS=-hwaccel cuda

# Intel QSV 加速
- FFMPEG_ARGS=-hwaccel qsv

# AMD VAAPI 加速
- FFMPEG_ARGS=-hwaccel vaapi
```

---

## 介面設定

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `WEBROOT` | - | 子路徑部署，例如 `/convertx` |
| `HIDE_HISTORY` | `false` | 隱藏歷史紀錄頁面 |

### 子路徑部署

如果需要在子路徑部署（如 `https://example.com/convertx`）：

```yaml
- WEBROOT=/convertx
```

---

## 本地化設定

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `LANGUAGE` | `en` | 日期格式語言（BCP 47 格式） |
| `TZ` | `UTC` | 時區設定 |

### 常用時區

```yaml
# 台灣
- TZ=Asia/Taipei

# 中國
- TZ=Asia/Shanghai

# 日本
- TZ=Asia/Tokyo

# 美國東部
- TZ=America/New_York
```

---

## 進階設定

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `UNAUTHENTICATED_USER_SHARING` | `false` | 未登入使用者是否共享檔案空間 |

---

## 完整範例

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

### 帶硬體加速

```yaml
environment:
  - JWT_SECRET=your-secret-key
  - FFMPEG_ARGS=-hwaccel cuda
  - FFMPEG_OUTPUT_ARGS=-c:v h264_nvenc -preset fast
```
