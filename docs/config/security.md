# 安全性設定

本文件說明 ConvertX-CN 的安全性相關設定與最佳實踐。

---

## Cookie 與登入安全

### HTTP_ALLOWED

控制是否允許非 HTTPS 連線。

```yaml
- HTTP_ALLOWED=true # 允許 HTTP（不安全，僅測試用）
- HTTP_ALLOWED=false # 僅允許 HTTPS（預設）
```

#### 運作原理

當 `HTTP_ALLOWED=false` 時，Cookie 會設定 `Secure` 屬性，只在 HTTPS 連線下傳送。

若實際用 HTTP 存取：

- 瀏覽器不會傳送 Cookie
- 每次請求都像未登入
- 造成「登入後又被踢回登入頁」

#### 設定建議

| 情境               | 設定值  |
| ------------------ | ------- |
| `localhost` 測試   | `true`  |
| 區網 IP 測試       | `true`  |
| 有 HTTPS 憑證      | `false` |
| 透過反向代理 HTTPS | `false` |

---

### TRUST_PROXY

是否信任反向代理傳來的 headers。

```yaml
- TRUST_PROXY=true # 信任 X-Forwarded-* headers
- TRUST_PROXY=false # 不信任（預設）
```

#### 運作原理

當請求經過反向代理時：

- 原始連線：使用者 → Nginx (HTTPS) → ConvertX (HTTP)
- 沒有 TRUST_PROXY：ConvertX 看到的是 HTTP 連線
- 有 TRUST_PROXY：ConvertX 讀取 `X-Forwarded-Proto: https`，知道原始是 HTTPS

#### 設定建議

| 情境                         | 設定值  |
| ---------------------------- | ------- |
| 直接存取容器（無 Proxy）     | `false` |
| 透過 Nginx / Traefik / Caddy | `true`  |
| 透過 Cloudflare Tunnel       | `true`  |

#### 安全注意

只在確實有反向代理時才設為 `true`。若直接暴露容器且設為 `true`，攻擊者可偽造 headers。

---

## 帳號安全

### ACCOUNT_REGISTRATION

```yaml
- ACCOUNT_REGISTRATION=true # 開放註冊
- ACCOUNT_REGISTRATION=false # 關閉註冊
```

#### 建議流程

1. 首次部署設為 `true`
2. 註冊管理員帳號
3. 改為 `false`
4. 重啟容器

首次註冊的帳號不受此限制。

### JWT_SECRET

```yaml
- JWT_SECRET=your-secret-key-at-least-32-chars
```

#### 重要性

- 用於簽署登入 Token
- 不設定：每次重啟產生新密鑰，所有人被登出
- 設定固定值：登入狀態跨重啟保留

#### 產生方式

```bash
# Linux / macOS
openssl rand -hex 32

# 輸出範例
# a1b2c3d4e5f6789...（64 字元）
```

---

## 公開服務安全

### ALLOW_UNAUTHENTICATED

```yaml
- ALLOW_UNAUTHENTICATED=true # 允許未登入使用
- ALLOW_UNAUTHENTICATED=false # 必須登入（預設）
```

#### 風險

設為 `true` 時：

- 任何人可使用轉換功能
- 消耗伺服器 CPU / 記憶體 / 磁碟
- 可能被惡意利用

#### 緩解措施

若需要公開服務，建議：

```yaml
environment:
  - ALLOW_UNAUTHENTICATED=true
  - AUTO_DELETE_EVERY_N_HOURS=1 # 頻繁清理
  - HIDE_HISTORY=true # 隱藏歷史
  - MAX_CONVERT_PROCESS=2 # 限制同時轉換數
```

---

## 網路安全

### 防火牆

只開放必要的埠：

```bash
# 僅允許特定 IP 存取
ufw allow from 192.168.1.0/24 to any port 3000
```

### 只允許本地存取

若透過反向代理，可限制容器只監聽 localhost：

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

這樣只有本機的反向代理可以存取，外部無法直接連線。

---

## 設定範例

### 最小安全配置（本地測試）

```yaml
environment:
  - HTTP_ALLOWED=true
```

### 標準安全配置（生產環境）

```yaml
environment:
  - JWT_SECRET=your-production-secret
  - HTTP_ALLOWED=false
  - TRUST_PROXY=true
  - ACCOUNT_REGISTRATION=false
```

### 高安全配置（敏感環境）

```yaml
services:
  convertx:
    ports:
      - "127.0.0.1:3000:3000" # 只允許本地
    environment:
      - JWT_SECRET=your-very-long-random-secret
      - HTTP_ALLOWED=false
      - TRUST_PROXY=true
      - ACCOUNT_REGISTRATION=false
      - ALLOW_UNAUTHENTICATED=false
      - AUTO_DELETE_EVERY_N_HOURS=1
```

---

## 相關文件

- [環境變數完整說明](environment.md)
- [反向代理設定](../deployment.md)
- [Docker Compose 詳解](../deployment/docker-compose.md)
