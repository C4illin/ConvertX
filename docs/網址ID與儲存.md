# URL ID 與儲存機制

> ⚠️ **此文件已遷移**
>
> 本文件內容已整合至新的文件結構，請參閱：
>
> - 🛠️ [專案結構](開發指南/專案結構.md)
> - 🐳 [Docker 部署](部署指南/Docker部署.md)
>
> 此文件將在未來版本中移除。

---

## 檔案儲存結構

ConvertX-CN 使用以下目錄結構儲存檔案：

```
/app/data/
├── convertx.db          # SQLite 資料庫
├── uploads/             # 上傳的原始檔案
│   └── {user_id}/
│       └── {job_id}/
│           ├── file1.docx
│           └── file2.pdf
└── output/              # 轉換後的檔案
    └── {user_id}/
        └── {job_id}/
            ├── file1.pdf
            └── file2.txt
```

---

## Job ID 說明

每次轉換任務都會產生一個唯一的 Job ID，用於：

- 追蹤轉換進度
- 組織檔案儲存
- 生成下載連結

### Job ID 格式

Job ID 是一個 UUID v4 格式的字串，例如：

```
550e8400-e29b-41d4-a716-446655440000
```

---

## URL 結構

### 結果頁面

```
/results/{job_id}
```

例如：

```
http://localhost:3000/results/550e8400-e29b-41d4-a716-446655440000
```

### 下載單一檔案

```
/download/{user_id}/{job_id}/{filename}
```

### 下載所有檔案（Tar）

```
/archive/{job_id}
```

---

## 資料持久化

### Docker Volume 映射

為了確保資料不會在容器重啟後遺失，請務必映射 `/app/data` 目錄：

```yaml
volumes:
  - ./data:/app/data
```

或使用 Named Volume：

```yaml
volumes:
  - convertx-data:/app/data

volumes:
  convertx-data:
```

---

## 自動清理

ConvertX-CN 會根據 `AUTO_DELETE_EVERY_N_HOURS` 設定自動清理過期檔案。

### 清理邏輯

1. 系統每 N 小時執行一次清理
2. 刪除建立時間超過 N 小時的 Job
3. 同時刪除對應的上傳檔案和輸出檔案
4. 資料庫記錄也會被清除

### 設定範例

```yaml
# 每 24 小時清理一次
- AUTO_DELETE_EVERY_N_HOURS=24

# 每 1 小時清理一次（公開服務建議）
- AUTO_DELETE_EVERY_N_HOURS=1

# 停用自動清理
- AUTO_DELETE_EVERY_N_HOURS=0
```

---

## 資料庫

ConvertX-CN 使用 SQLite 作為資料庫，儲存於 `/app/data/convertx.db`。

### 資料表結構

#### users

| 欄位     | 類型    | 說明      |
| -------- | ------- | --------- |
| id       | INTEGER | 使用者 ID |
| email    | TEXT    | 電子郵件  |
| password | TEXT    | 密碼雜湊  |

#### jobs

| 欄位         | 類型    | 說明      |
| ------------ | ------- | --------- |
| id           | TEXT    | Job UUID  |
| user_id      | INTEGER | 使用者 ID |
| num_files    | INTEGER | 檔案數量  |
| date_created | TEXT    | 建立時間  |

#### file_names

| 欄位             | 類型    | 說明     |
| ---------------- | ------- | -------- |
| id               | INTEGER | 檔案 ID  |
| job_id           | TEXT    | Job UUID |
| input_file_name  | TEXT    | 原始檔名 |
| output_file_name | TEXT    | 輸出檔名 |
| status           | TEXT    | 轉換狀態 |

---

## 備份與還原

### 備份

```bash
# 備份整個 data 目錄
tar -czvf convertx-backup-$(date +%Y%m%d).tar.gz ./data

# 僅備份資料庫
cp ./data/convertx.db ./backup-convertx-$(date +%Y%m%d).db
```

### 還原

```bash
# 還原整個 data 目錄
tar -xzvf convertx-backup-20240101.tar.gz

# 還原資料庫
cp ./backup-convertx-20240101.db ./data/convertx.db
```

---

## 注意事項

1. **權限問題**：確保 Docker 容器有權限寫入 data 目錄
2. **磁碟空間**：大量轉換可能佔用大量磁碟空間，建議設定自動清理
3. **資料安全**：敏感文件轉換後建議手動刪除或縮短保留時間
