# 常見問題 FAQ

---

## 🔐 登入與帳號

### Q: 如何註冊帳號？

首次訪問 ConvertX-CN 時：

1. 開啟 `http://localhost:3000`
2. 點擊右上角 **Register**
3. 輸入 Email 和密碼
4. 完成！系統會自動登入

> ✅ **預設開放註冊**，無需設定任何環境變數

### Q: 可以關閉公開註冊嗎？

可以。如果您想限制只有現有用戶可使用：

```yaml
environment:
  - ACCOUNT_REGISTRATION=false
```

> ⚠️ 請確保您已經有至少一個帳號，否則將無法登入

### Q: 忘記密碼怎麼辦？

目前版本尚未提供密碼重設功能。您可以：

1. 刪除 `data/convertx.db`
2. 重新啟動容器
3. 重新註冊

> ⚠️ 這會刪除所有用戶資料和轉換歷史

### Q: 登入後又被踢回登入頁？

這通常是 Cookie 設定問題。請檢查：

1. **沒有 HTTPS 但 HTTP_ALLOWED=false**

   ```yaml
   - HTTP_ALLOWED=true # 允許 HTTP 連線
   ```

2. **使用反向代理但沒設定 TRUST_PROXY**

   ```yaml
   - TRUST_PROXY=true # 信任反向代理
   ```

3. **沒有設定 JWT_SECRET**
   ```yaml
   - JWT_SECRET=固定的隨機字串
   ```

---

## 🐳 Docker 相關

### Q: 為什麼 Image 這麼大（4-6 GB）？

ConvertX-CN 是「完整版」，內建：

- LibreOffice（文件轉換）
- TexLive（LaTeX 支援）
- FFmpeg（影音轉換）
- Tesseract + 多語言 OCR
- CJK 字型

如果您只需要基本功能，可使用原作者的輕量版：`ghcr.io/c4illin/convertx:latest`

### Q: Docker 啟動失敗？

常見原因：

1. **Port 被占用**：改用其他 port，如 `-p 3001:3000`
2. **磁碟空間不足**：Image 需約 6GB
3. **權限問題**：確保 `./data` 資料夾有寫入權限

```bash
chmod -R 777 ./data
```

### Q: 資料存在哪裡？

所有資料存放在掛載的 `/app/data` 目錄：

```
./data/
├── convertx.db  # SQLite 資料庫
├── uploads/     # 上傳的原始檔案
└── output/      # 轉換後的檔案
```

### Q: 如何備份資料？

直接備份 `./data` 資料夾：

```bash
tar -czvf convertx-backup.tar.gz ./data
```

### Q: 如何更新版本？

```bash
docker compose pull
docker compose up -d
```

---

## 🌍 語言相關

### Q: 如何切換介面語言？

1. 點擊右上角語言圖示 🌐
2. 從下拉選單選擇語言
3. 頁面自動更新

語言偏好會儲存在 Cookie 中。

### Q: 支援哪些語言？

目前支援 65 種語言，包含：

- 繁體中文、簡體中文
- 日文、韓文
- 英文、德文、法文
- 更多詳見 [多語言支援](../features/i18n.md)

---

## 📄 轉換相關

### Q: 支援哪些格式？

1000+ 種格式，詳見 [支援的轉換器](../features/converters.md)

### Q: 轉換失敗怎麼辦？

1. 檢查檔案是否損壞
2. 檢查容器日誌：`docker logs convertx-cn`
3. 嘗試不同的轉換引擎

### Q: 檔案大小有限制嗎？

預設無限制，但可透過反向代理設定限制：

```nginx
client_max_body_size 500M;
```

### Q: 轉換很慢怎麼辦？

1. 增加容器記憶體限制
2. 考慮使用硬體加速（GPU）
3. 限制同時轉換數量：
   ```yaml
   - MAX_CONVERT_PROCESS=2
   ```

---

## 🔧 進階問題

### Q: 如何使用反向代理？

詳見 [反向代理設定](../deployment/reverse-proxy.md)

### Q: 如何啟用硬體加速？

詳見 [進階配置 - 硬體加速](../deployment/docker.md#硬體加速)

### Q: 如何啟用 API Server？

```bash
docker compose --profile api up -d
```

詳見 [API 文件](../api/overview.md)

---

## 還有問題？

- 📖 查看 [完整文件](../README.md)
- 🐛 回報問題：[GitHub Issues](https://github.com/pi-docket/ConvertX-CN/issues)
- 💬 討論區：[GitHub Discussions](https://github.com/pi-docket/ConvertX-CN/discussions)
