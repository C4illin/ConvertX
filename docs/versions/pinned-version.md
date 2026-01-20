# 指定版本部署

本文件說明如何使用固定版本標籤部署 ConvertX-CN。

---

## 為什麼要指定版本？

使用固定版本可以：

- 確保每次部署結果一致
- 避免意外升級造成問題
- 方便在多台伺服器部署相同版本
- 出問題時容易回滾

---

## 如何指定版本

修改 `docker-compose.yml`：

```yaml
services:
  convertx:
    image: convertx/convertx-cn:v0.1.9 # 指定版本
```

---

## 查看可用版本

### GitHub Releases

[https://github.com/pi-docket/ConvertX-CN/releases](https://github.com/pi-docket/ConvertX-CN/releases)

### Docker Hub

```bash
# 列出所有標籤
docker search convertx/convertx-cn --limit 100

# 或查看 Docker Hub 網頁
# https://hub.docker.com/r/convertx/convertx-cn/tags
```

---

## 版本命名規則

| 格式     | 說明                 | 範例     |
| -------- | -------------------- | -------- |
| `vX.Y.Z` | 正式版本             | `v0.1.9` |
| `latest` | 最新穩定版           | -        |
| `main`   | 最新開發版（不穩定） | -        |

---

## 升級到新版本

1. 查看 [Changelog](../../CHANGELOG.md) 確認變更
2. 修改 docker-compose.yml 的版本號
3. 執行更新

```bash
docker compose down
docker compose pull
docker compose up -d
```

詳見 [版本更新指南](../deployment/update.md)。

---

## 回滾到舊版本

如果新版本有問題：

1. 修改版本號為舊版本

```yaml
image: convertx/convertx-cn:v0.1.8
```

2. 重新部署

```bash
docker compose down
docker compose pull
docker compose up -d
```

---

## 生產環境建議

### 部署流程

1. 在測試環境使用 `latest` 或新版本
2. 確認功能正常
3. 記錄版本號
4. 生產環境使用該固定版本

### 版本記錄

建議在 docker-compose.yml 加上註解：

```yaml
services:
  convertx:
    # 2026-01-20 升級：修復 PDF 轉換問題
    image: convertx/convertx-cn:v0.1.9
```

---

## 相關文件

- [使用 latest 標籤](latest.md)
- [版本更新指南](../deployment/update.md)
- [Changelog](../../CHANGELOG.md)
