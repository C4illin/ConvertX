# API 端點

本文件列出 ConvertX API Server 的所有可用端點。

---

## REST API

Base URL: `http://localhost:3001/api/v1`

---

### 健康檢查

#### `GET /health`

檢查 API Server 運作狀態。**不需要認證**。

**回應**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

---

### 引擎管理

#### `GET /api/v1/engines`

列出所有可用的轉換引擎。

**Headers**

```
Authorization: Bearer <token>
```

**回應**

```json
{
  "engines": [
    {
      "id": "ffmpeg",
      "name": "FFmpeg",
      "description": "Audio and video conversion",
      "supported_input_formats": ["mp4", "webm", "avi", ...],
      "supported_output_formats": ["mp4", "webm", "mp3", ...]
    },
    ...
  ]
}
```

#### `GET /api/v1/engines/{engine_id}`

取得特定引擎的詳細資訊。

**參數**

| 參數      | 類型   | 說明    |
| --------- | ------ | ------- |
| engine_id | string | 引擎 ID |

**回應**

```json
{
  "id": "libreoffice",
  "name": "LibreOffice",
  "description": "Office document conversion",
  "supported_input_formats": ["doc", "docx", "xls", ...],
  "supported_output_formats": ["pdf", "odt", "txt", ...]
}
```

---

### 檔案轉換

#### `POST /api/v1/convert`

上傳檔案並執行轉換。

**Headers**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**參數**

| 參數          | 類型   | 必填 | 說明         |
| ------------- | ------ | ---- | ------------ |
| file          | file   | ✓    | 要轉換的檔案 |
| engine        | string | ✓    | 轉換引擎 ID  |
| output_format | string | ✓    | 目標格式     |

**範例**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.docx" \
  -F "engine=libreoffice" \
  -F "output_format=pdf" \
  http://localhost:3001/api/v1/convert
```

**成功回應**

```json
{
  "job_id": "abc123",
  "status": "completed",
  "output_file": "http://localhost:3001/api/v1/files/abc123/output.pdf"
}
```

**失敗回應（含建議）**

```json
{
  "error": "UNSUPPORTED_CONVERSION",
  "message": "Engine 'ffmpeg' does not support .docx input",
  "suggestions": [
    {
      "engine": "libreoffice",
      "supported_output_formats": ["pdf", "odt", "txt"]
    },
    {
      "engine": "pandoc",
      "supported_output_formats": ["pdf", "html", "markdown"]
    }
  ]
}
```

---

### 檔案下載

#### `GET /api/v1/files/{job_id}/{filename}`

下載轉換後的檔案。

**參數**

| 參數     | 類型   | 說明     |
| -------- | ------ | -------- |
| job_id   | string | 任務 ID  |
| filename | string | 檔案名稱 |

---

## GraphQL API

Endpoint: `http://localhost:3001/graphql`

---

### Schema 概覽

```graphql
type Query {
  health: HealthStatus!
  engines: [Engine!]!
  engine(id: ID!): Engine
  job(id: ID!): ConversionJob
}

type Mutation {
  convert(input: ConvertInput!): ConversionJob!
}

type Engine {
  id: ID!
  name: String!
  description: String!
  supportedInputFormats: [String!]!
  supportedOutputFormats: [String!]!
}

type ConversionJob {
  id: ID!
  status: JobStatus!
  inputFile: String!
  outputFile: String
  engine: String!
  createdAt: DateTime!
  completedAt: DateTime
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

input ConvertInput {
  fileId: ID!
  engine: String!
  outputFormat: String!
}
```

### 查詢範例

#### 列出引擎

```graphql
query {
  engines {
    id
    name
    supportedInputFormats
    supportedOutputFormats
  }
}
```

#### 查詢任務狀態

```graphql
query {
  job(id: "abc123") {
    id
    status
    outputFile
    completedAt
  }
}
```

---

## 錯誤代碼

| 錯誤碼                   | HTTP 狀態 | 說明               |
| ------------------------ | --------- | ------------------ |
| `MISSING_AUTH_HEADER`    | 401       | 缺少 Authorization |
| `INVALID_TOKEN`          | 401       | Token 無效         |
| `TOKEN_EXPIRED`          | 401       | Token 已過期       |
| `ENGINE_NOT_FOUND`       | 404       | 引擎不存在         |
| `UNSUPPORTED_CONVERSION` | 400       | 不支援的轉換       |
| `FILE_TOO_LARGE`         | 413       | 檔案過大           |
| `CONVERSION_FAILED`      | 500       | 轉換失敗           |

---

## 相關文件

- [API 總覽](overview.md)
- [API 規格文件](../../api-server/docs/API_SPEC.md)
