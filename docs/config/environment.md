# 環境變數完整說明

> ⚠️ **此文件已遷移**
>
> 本文件內容已整合至新的文件結構，請參閱：
>
> - ⚙️ [環境變數設定](../配置設定/環境變數.md)
> - 🔒 [安全性設定](../配置設定/安全性.md)
> - 🧹 [清理與限制](../配置設定/清理與限制.md)
>
> 此文件將在未來版本中移除。

---

本文件列出 ConvertX-CN 所有可用的環境變數設定。

---

## 快速參考

| 優先級 | 變數           | 說明         | 預設值             |
| ------ | -------------- | ------------ | ------------------ |
| 必填   | `JWT_SECRET`   | 登入驗證金鑰 | 隨機（每次重啟變） |
| 建議   | `TZ`           | 時區         | `UTC`              |
| 建議   | `HTTP_ALLOWED` | 允許 HTTP    | `false`            |
| 可選   | `TRUST_PROXY`  | 信任反向代理 | `false`            |
| 可選   | 其他           | 依需求設定   | -                  |

---

## 必填設定

### JWT_SECRET

用於簽署登入驗證的密鑰。

| 項目   | 值                     |
| ------ | ---------------------- |
| 預設值 | 每次重啟隨機產生       |
| 建議值 | 至少 32 字元的隨機字串 |

不設定的話，每次容器重啟後所有使用者都需要重新登入。

產生方式：

```bash
openssl rand -hex 32
```

---

## 網路與安全

### HTTP_ALLOWED

允許非 HTTPS 連線。

| 項目   | 值      |
| ------ | ------- |
| 預設值 | `false` |

| 情境                  | 設定值  |
| --------------------- | ------- |
| 本地測試 (localhost)  | `true`  |
| 有 HTTPS              | `false` |
| 無 HTTPS 但需遠端存取 | `true`  |

設為 `false` 但用 HTTP 存取會導致「登入後又被導回登入頁」。

### TRUST_PROXY

信任反向代理的 headers（`X-Forwarded-Proto` 等）。

| 項目   | 值      |
| ------ | ------- |
| 預設值 | `false` |

| 情境                         | 設定值  |
| ---------------------------- | ------- |
| 直接存取容器                 | `false` |
| 透過 Nginx / Traefik / Caddy | `true`  |

詳見 [安全性設定](security.md)。

### ACCOUNT_REGISTRATION

是否允許註冊新帳號。

| 項目   | 值     |
| ------ | ------ |
| 預設值 | `true` |

首次註冊不受此限制。建議建立管理員帳號後改為 `false`。

### ALLOW_UNAUTHENTICATED

是否允許未登入使用轉換功能。

| 項目   | 值      |
| ------ | ------- |
| 預設值 | `false` |

設為 `true` 有安全風險：任何人都可使用伺服器資源。

---

## 一般設定

### TZ

時區設定，影響日期顯示。

| 項目   | 值    |
| ------ | ----- |
| 預設值 | `UTC` |

常用值：

| 地區 | 值               |
| ---- | ---------------- |
| 台灣 | `Asia/Taipei`    |
| 中國 | `Asia/Shanghai`  |
| 香港 | `Asia/Hong_Kong` |
| 日本 | `Asia/Tokyo`     |

### AUTO_DELETE_EVERY_N_HOURS

自動刪除超過 N 小時的檔案。

| 項目   | 值   |
| ------ | ---- |
| 預設值 | `24` |
| 停用   | `0`  |

---

## 介面設定

### WEBROOT

子路徑部署前綴。

| 項目   | 值  |
| ------ | --- |
| 預設值 | 空  |

若透過 `https://example.com/convertx/` 存取：

```yaml
- WEBROOT=/convertx
```

### HIDE_HISTORY

隱藏歷史紀錄頁面。

| 項目   | 值      |
| ------ | ------- |
| 預設值 | `false` |

### LANGUAGE

日期格式語言（BCP 47 格式）。

| 項目   | 值   |
| ------ | ---- |
| 預設值 | `en` |

---

## 轉換設定

### MAX_CONVERT_PROCESS

最大同時轉換任務數。

| 項目   | 值            |
| ------ | ------------- |
| 預設值 | `0`（無限制） |

### FFMPEG_ARGS

FFmpeg 輸入參數（硬體加速等）。

| 項目   | 值  |
| ------ | --- |
| 預設值 | 空  |

```yaml
# NVIDIA GPU
- FFMPEG_ARGS=-hwaccel cuda

# Intel QSV
- FFMPEG_ARGS=-hwaccel qsv
```

### FFMPEG_OUTPUT_ARGS

FFmpeg 輸出參數。

| 項目   | 值  |
| ------ | --- |
| 預設值 | 空  |

```yaml
- FFMPEG_OUTPUT_ARGS=-preset veryfast
```

---

## 情境範例

### 開發環境

```yaml
environment:
  - TZ=Asia/Taipei
  - HTTP_ALLOWED=true
  - ACCOUNT_REGISTRATION=true
```

### 生產環境

```yaml
environment:
  - TZ=Asia/Taipei
  - JWT_SECRET=your-production-secret-at-least-32-chars
  - HTTP_ALLOWED=false
  - TRUST_PROXY=true
  - ACCOUNT_REGISTRATION=false
  - AUTO_DELETE_EVERY_N_HOURS=24
```

### 公開服務

```yaml
environment:
  - ALLOW_UNAUTHENTICATED=true
  - HIDE_HISTORY=true
  - AUTO_DELETE_EVERY_N_HOURS=1
```

---

## 相關文件

- [安全性設定](security.md)
- [進階部署](../deployment.md)
- [Docker Compose 詳解](../deployment/docker-compose.md)
