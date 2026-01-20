# 常見問題 FAQ

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

---

## 🐳 Docker 相關

### Q: 為什麼 Image 這麼大（4-6 GB）？

ConvertX-CN 是「完整版」，內建：
- LibreOffice（文件轉換）
- TexLive（LaTeX 支援）
- FFmpeg（影音轉換）
- Tesseract + 多語言 OCR
- CJK 字型

如果您只需要基本功能，可使用原作者的輕量版：
- `ghcr.io/c4illin/convertx:latest`

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
- `convertx.db` - SQLite 資料庫
- `uploads/` - 上傳的原始檔案
- `output/` - 轉換後的檔案

---

## 🌍 語言相關

### Q: 如何切換語言？

1. 點擊右上角語言圖示 🌐
2. 從下拉選單選擇語言
3. 頁面自動更新

語言偏好會儲存在 Cookie 中。

### Q: 支援哪些語言？

目前支援 65 種語言，詳見 [i18n.md](i18n.md)

### Q: 如何貢獻翻譯？

1. 複製 `src/locales/en.json`
2. 重命名為 `xx.json`（語言代碼）
3. 翻譯所有文字
4. 在 `src/i18n/index.ts` 中註冊
5. 提交 Pull Request

---

## 📄 轉換相關

### Q: 支援哪些格式？

ConvertX-CN 支援數百種格式，包括：
- **影音**：MP4, AVI, MKV, MP3, WAV 等
- **圖片**：PNG, JPG, WEBP, SVG, PDF 等
- **文件**：DOCX, PDF, XLSX, PPTX 等
- **電子書**：EPUB, MOBI, AZW3 等

完整列表見 [converters.md](converters.md)

### Q: 轉換失敗怎麼辦？

1. 檢查檔案是否損壞
2. 確認格式組合是否支援
3. 查看容器 logs：
   ```bash
   docker logs convertx-cn
   ```

### Q: 檔案大小有限制嗎？

預設無硬性限制，但大檔案：
- 上傳需要更長時間
- 轉換可能耗用大量記憶體

建議為容器分配足夠的記憶體資源。

---

## 🔧 進階問題

### Q: 可以使用 HTTPS 嗎？

可以。推薦使用反向代理（如 Traefik、Nginx）處理 SSL。

詳見 [advanced-usage.md](advanced-usage.md)

### Q: 如何備份資料？

```bash
# 備份
docker cp convertx-cn:/app/data ./backup

# 還原
docker cp ./backup/. convertx-cn:/app/data
```

### Q: 有 API 文件嗎？

目前尚未提供正式的 API 文件。如有 API 需求，歡迎開 Issue 討論。
