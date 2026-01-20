# 環境變數設定

所有環境變數皆為選填，建議至少設定 `JWT_SECRET`。

## 安全性設定

| 變數名稱             | 預設值       | 說明                               |
| -------------------- | ------------ | ---------------------------------- |
| JWT_SECRET           | randomUUID() | 用於簽署 JWT 的密鑰字串（請務必更改） |
| ACCOUNT_REGISTRATION | false        | 是否允許註冊新帳號                 |
| HTTP_ALLOWED         | false        | 是否允許 HTTP 連線（僅本地使用）   |
| ALLOW_UNAUTHENTICATED| false        | 是否允許未登入使用                 |

## 檔案管理

| 變數名稱                  | 預設值 | 說明                                 |
| ------------------------- | ------ | ------------------------------------ |
| AUTO_DELETE_EVERY_N_HOURS | 24     | 自動刪除超過 N 小時的檔案（0 = 停用） |

## 進階設定

| 變數名稱           | 預設值 | 說明                                   |
| ------------------ | ------ | -------------------------------------- |
| WEBROOT            |        | 子路徑部署，例如 `/convertx`           |
| FFMPEG_ARGS        |        | FFmpeg 輸入參數，例如 `-hwaccel vaapi` |
| FFMPEG_OUTPUT_ARGS |        | FFmpeg 輸出參數，例如 `-preset veryfast` |
| HIDE_HISTORY       | false  | 隱藏歷史紀錄頁面                       |
| MAX_CONVERT_PROCESS| 0      | 最大同時轉換數（0 = 無限制）           |

## 本地化設定

| 變數名稱 | 預設值 | 說明                          |
| -------- | ------ | ----------------------------- |
| LANGUAGE | en     | 日期格式語言（BCP 47 格式）   |
| TZ       | UTC    | 時區設定，例如 `Asia/Taipei`  |

## 範例配置

### 開發環境

```yaml
environment:
  - HTTP_ALLOWED=true
  - ACCOUNT_REGISTRATION=true
```

### 生產環境

```yaml
environment:
  - JWT_SECRET=your-very-long-and-random-secret-key
  - ACCOUNT_REGISTRATION=false
  - HTTP_ALLOWED=false
  - TZ=Asia/Taipei
  - AUTO_DELETE_EVERY_N_HOURS=48
```

### 公開服務（允許匿名使用）

```yaml
environment:
  - ALLOW_UNAUTHENTICATED=true
  - HIDE_HISTORY=true
  - AUTO_DELETE_EVERY_N_HOURS=1
```
