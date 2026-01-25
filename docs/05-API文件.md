# API 文件

ConvertX-CN 提供選用的 API Server，支援 REST 和 GraphQL 兩種 API 介面。

---

## 目錄

- [快速啟用](#快速啟用)
- [認證機制](#認證機制)
- [REST API 端點](#rest-api-端點)
- [GraphQL API](#graphql-api)
- [錯誤碼說明](#錯誤碼說明)
- [使用範例](#使用範例)

---

## 快速啟用

API Server 是**選用功能**，不影響 Web UI 使用。

### 啟用方式

```bash
docker compose --profile api up -d
```

### 服務端口

| 服務 | 端口 | 說明 |
|------|------|------|
| Web UI | 3000 | 網頁介面 |
| API Server | 3001 | REST & GraphQL |

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `API_HOST` | 監聽地址 | `0.0.0.0` |
| `API_PORT` | 監聽埠 | `3001` |
| `JWT_SECRET` | JWT 驗證密鑰 | （需自行設定） |
| `UPLOAD_DIR` | 上傳目錄 | `./data/uploads` |
| `OUTPUT_DIR` | 輸出目錄 | `./data/output` |
| `MAX_FILE_SIZE` | 最大檔案大小（bytes） | `104857600` |

---

## 認證機制

所有 API 請求（除健康檢查外）都需要 JWT Bearer Token：

```http
Authorization: Bearer <your-jwt-token>
```

### Token 結構

```json
{
  "sub": "user-id",
  "exp": 1234567890,
  "iat": 1234567890,
  "email": "user@example.com",
  "roles": ["user"]
}
```

> ⚠️ **注意**：API Server 只負責驗證 JWT，不負責產生 JWT。Token 應由獨立的認證服務產生。

---

## REST API 端點

**Base URL**: `http://localhost:3001/api/v1`

### 健康檢查

檢查 API Server 運行狀態。

**請求**：

```http
GET /health
```

**回應**：

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-01-25T10:30:00Z"
}
```

---

### 取得支援格式

取得所有支援的輸入/輸出格式。

**請求**：

```http
GET /api/v1/formats
Authorization: Bearer <token>
```

**回應**：

```json
{
  "converters": [
    {
      "name": "ffmpeg",
      "inputFormats": ["mp4", "mkv", "avi", "..."],
      "outputFormats": ["mp4", "webm", "mp3", "..."]
    },
    {
      "name": "imagemagick",
      "inputFormats": ["png", "jpg", "heic", "..."],
      "outputFormats": ["png", "jpg", "webp", "..."]
    }
  ]
}
```

---

### 上傳檔案

上傳待轉換的檔案。

**請求**：

```http
POST /api/v1/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

**回應**：

```json
{
  "success": true,
  "fileId": "abc123",
  "filename": "document.docx",
  "size": 1048576,
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
```

---

### 開始轉換

對已上傳的檔案進行轉換。

**請求**：

```http
POST /api/v1/convert
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileId": "abc123",
  "outputFormat": "pdf",
  "options": {
    "quality": "high"
  }
}
```

**回應**：

```json
{
  "success": true,
  "jobId": "job456",
  "status": "processing",
  "estimatedTime": 30
}
```

---

### 查詢轉換狀態

取得轉換任務的當前狀態。

**請求**：

```http
GET /api/v1/jobs/{jobId}
Authorization: Bearer <token>
```

**回應（處理中）**：

```json
{
  "jobId": "job456",
  "status": "processing",
  "progress": 45,
  "message": "Converting page 3 of 10..."
}
```

**回應（完成）**：

```json
{
  "jobId": "job456",
  "status": "completed",
  "progress": 100,
  "result": {
    "fileId": "result789",
    "filename": "document.pdf",
    "size": 524288,
    "downloadUrl": "/api/v1/download/result789"
  }
}
```

---

### 下載結果

下載轉換完成的檔案。

**請求**：

```http
GET /api/v1/download/{fileId}
Authorization: Bearer <token>
```

**回應**：

```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"

<binary content>
```

---

### 刪除檔案

刪除已上傳或轉換完成的檔案。

**請求**：

```http
DELETE /api/v1/files/{fileId}
Authorization: Bearer <token>
```

**回應**：

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## GraphQL API

**Endpoint**: `http://localhost:3001/graphql`

### Schema 概覽

```graphql
type Query {
  health: Health!
  formats: [Converter!]!
  job(id: ID!): Job
  jobs: [Job!]!
}

type Mutation {
  upload(file: Upload!): UploadResult!
  convert(input: ConvertInput!): ConvertResult!
  deleteFile(fileId: ID!): DeleteResult!
}

type Health {
  status: String!
  version: String!
  timestamp: String!
}

type Converter {
  name: String!
  inputFormats: [String!]!
  outputFormats: [String!]!
}

type Job {
  id: ID!
  status: JobStatus!
  progress: Int!
  message: String
  result: ConvertedFile
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 查詢範例

**取得所有格式**：

```graphql
query {
  formats {
    name
    inputFormats
    outputFormats
  }
}
```

**查詢任務狀態**：

```graphql
query {
  job(id: "job456") {
    status
    progress
    message
    result {
      filename
      size
      downloadUrl
    }
  }
}
```

### 變更範例

**開始轉換**：

```graphql
mutation {
  convert(input: {
    fileId: "abc123"
    outputFormat: "pdf"
    options: { quality: "high" }
  }) {
    jobId
    status
  }
}
```

---

## 錯誤碼說明

### HTTP 狀態碼

| 狀態碼 | 說明 | 常見原因 |
|--------|------|---------|
| 200 | 成功 | 請求正常處理 |
| 400 | 錯誤請求 | 參數錯誤、格式不支援 |
| 401 | 未授權 | Token 無效或過期 |
| 403 | 禁止存取 | 權限不足 |
| 404 | 找不到 | 檔案或任務不存在 |
| 413 | 檔案太大 | 超過上傳限制 |
| 415 | 格式不支援 | 不支援的檔案類型 |
| 500 | 伺服器錯誤 | 內部錯誤 |
| 503 | 服務不可用 | 伺服器過載 |

### 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_FORMAT",
    "message": "The format 'xyz' is not supported",
    "details": {
      "inputFormat": "xyz",
      "supportedFormats": ["pdf", "docx", "png"]
    }
  }
}
```

### 常見錯誤碼

| 錯誤碼 | 說明 | 解決方法 |
|--------|------|---------|
| `INVALID_TOKEN` | Token 無效 | 重新取得有效 Token |
| `TOKEN_EXPIRED` | Token 過期 | 刷新 Token |
| `FILE_NOT_FOUND` | 檔案不存在 | 確認檔案 ID 正確 |
| `UNSUPPORTED_FORMAT` | 格式不支援 | 查看支援格式列表 |
| `FILE_TOO_LARGE` | 檔案過大 | 壓縮或分割檔案 |
| `CONVERSION_FAILED` | 轉換失敗 | 檢查檔案是否損壞 |
| `RATE_LIMITED` | 請求過頻繁 | 降低請求頻率 |

---

## 使用範例

### cURL 範例

**上傳並轉換檔案**：

```bash
# 1. 上傳檔案
FILE_RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.docx" \
  http://localhost:3001/api/v1/upload)

FILE_ID=$(echo $FILE_RESPONSE | jq -r '.fileId')

# 2. 開始轉換
JOB_RESPONSE=$(curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\": \"$FILE_ID\", \"outputFormat\": \"pdf\"}" \
  http://localhost:3001/api/v1/convert)

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')

# 3. 等待完成並下載
sleep 10

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/download/$FILE_ID \
  -o output.pdf
```

### Python 範例

```python
import requests

BASE_URL = "http://localhost:3001/api/v1"
TOKEN = "your-jwt-token"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# 上傳檔案
with open("document.docx", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/upload",
        headers=HEADERS,
        files={"file": f}
    )
    file_id = response.json()["fileId"]

# 開始轉換
response = requests.post(
    f"{BASE_URL}/convert",
    headers=HEADERS,
    json={"fileId": file_id, "outputFormat": "pdf"}
)
job_id = response.json()["jobId"]

# 輪詢狀態
import time
while True:
    response = requests.get(f"{BASE_URL}/jobs/{job_id}", headers=HEADERS)
    status = response.json()["status"]
    if status == "completed":
        break
    time.sleep(2)

# 下載結果
result_id = response.json()["result"]["fileId"]
response = requests.get(f"{BASE_URL}/download/{result_id}", headers=HEADERS)
with open("output.pdf", "wb") as f:
    f.write(response.content)
```

### JavaScript 範例

```javascript
const BASE_URL = 'http://localhost:3001/api/v1';
const TOKEN = 'your-jwt-token';

async function convertFile(file, outputFormat) {
  // 上傳檔案
  const formData = new FormData();
  formData.append('file', file);
  
  const uploadResponse = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: formData
  });
  const { fileId } = await uploadResponse.json();
  
  // 開始轉換
  const convertResponse = await fetch(`${BASE_URL}/convert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId, outputFormat })
  });
  const { jobId } = await convertResponse.json();
  
  // 輪詢狀態
  let result;
  while (true) {
    const statusResponse = await fetch(`${BASE_URL}/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const job = await statusResponse.json();
    if (job.status === 'completed') {
      result = job.result;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 下載結果
  const downloadResponse = await fetch(`${BASE_URL}/download/${result.fileId}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  return await downloadResponse.blob();
}
```

---

[⬆️ 回到頂部](#api-文件) | [📚 回到目錄](00-專案總覽.md)
