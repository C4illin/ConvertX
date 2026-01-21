# ConvertX API 規格文件

## 概述

ConvertX API Server 是一個獨立的檔案轉換 API 服務，同時提供 REST API 和 GraphQL API。
兩種 API 是完全獨立的服務，使用者可以選擇只使用其中一種。

## 認證

### JWT Bearer Token

所有 API 請求（除了健康檢查）都需要在 HTTP Header 中提供有效的 JWT Token：

```http
Authorization: Bearer <jwt-token>
```

### Token 結構

```json
{
  "sub": "user-unique-id",
  "exp": 1735689600,
  "iat": 1735603200,
  "email": "user@example.com",
  "roles": ["user", "admin"]
}
```

| 欄位 | 必填 | 說明 |
|------|------|------|
| `sub` | ✓ | 使用者唯一識別碼 |
| `exp` | ✓ | Token 過期時間（Unix timestamp） |
| `iat` | ✓ | Token 簽發時間（Unix timestamp） |
| `email` | - | 使用者 Email |
| `roles` | - | 使用者角色列表 |

### 認證錯誤回應

| 狀況 | 錯誤碼 | HTTP 狀態 |
|------|--------|-----------|
| 缺少 Authorization Header | `MISSING_AUTH_HEADER` | 401 |
| Token 格式錯誤 | `INVALID_TOKEN` | 401 |
| Token 簽名無效 | `INVALID_TOKEN` | 401 |
| Token 已過期 | `TOKEN_EXPIRED` | 401 |

---

## REST API 規格

### 基礎資訊

- **Base URL**: `http://localhost:3001/api/v1`
- **Content-Type**: `application/json`（一般請求）或 `multipart/form-data`（檔案上傳）

---

### 健康檢查

#### `GET /health` 或 `GET /api/v1/health`

檢查 API Server 運作狀態。不需要認證。

**回應**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-15T10:30:00Z"
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
      "description": "Audio and video conversion using FFmpeg",
      "supported_input_formats": ["mp4", "webm", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "m4a", "gif"],
      "supported_output_formats": ["webm", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif", "m4a", "aac", "mp4"]
    },
    {
      "id": "imagemagick",
      "name": "ImageMagick",
      "description": "Image format conversion using ImageMagick",
      "supported_input_formats": ["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "svg"],
      "supported_output_formats": ["jpg", "jpeg", "gif", "bmp", "webp", "tiff", "ico", "pdf", "png"]
    }
  ]
}
```

---

#### `GET /api/v1/engines/:engine_id`

取得特定引擎的詳細資訊。

**參數**
- `engine_id`: 引擎識別碼（如 `ffmpeg`, `imagemagick`）

**回應 (200)**

```json
{
  "id": "ffmpeg",
  "name": "FFmpeg",
  "description": "Audio and video conversion using FFmpeg",
  "supported_input_formats": ["mp4", "webm", "avi"],
  "supported_output_formats": ["mp4", "webm", "mp3"]
}
```

**回應 (404)**

```json
{
  "error": {
    "code": "ENGINE_NOT_FOUND",
    "message": "Engine not found: nonexistent"
  }
}
```

---

#### `GET /api/v1/engines/:engine_id/conversions`

取得特定引擎支援的轉換對應表。

**回應**

```json
{
  "engine_id": "ffmpeg",
  "conversions": {
    "mp4": ["webm", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif"],
    "webm": ["mp4", "avi", "mkv", "mov", "mp3", "wav", "flac", "ogg", "gif"],
    "mp3": ["wav", "flac", "ogg", "m4a", "aac"]
  }
}
```

---

### 轉檔任務

#### `POST /api/v1/convert`

建立新的轉檔任務。

**Headers**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表單欄位**

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `file` | File | ✓ | 要轉換的檔案 |
| `engine` | String | ✓ | 轉換引擎 ID |
| `target_format` | String | ✓ | 目標格式（不含點） |
| `options` | String | - | JSON 格式的轉換選項 |

**回應 (201)**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Conversion job created successfully"
}
```

**回應 (422) - 不支援的轉換**

```json
{
  "error": {
    "code": "UNSUPPORTED_CONVERSION",
    "message": "Unsupported conversion from pdf to mp4 using engine ffmpeg",
    "suggestions": [
      {
        "engine": "libreoffice",
        "from": "pdf",
        "to": "docx"
      },
      {
        "engine": "libreoffice",
        "from": "pdf",
        "to": "html"
      },
      {
        "engine": "calibre",
        "from": "pdf",
        "to": "epub"
      }
    ]
  }
}
```

---

#### `GET /api/v1/jobs`

列出當前使用者的所有任務。

**回應**

```json
{
  "jobs": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "original_filename": "video.mp4",
      "source_format": "mp4",
      "target_format": "webm",
      "engine": "ffmpeg",
      "download_url": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/download",
      "created_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-15T10:01:30Z"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/v1/jobs/:job_id`

取得特定任務的狀態。

**任務狀態**

| 狀態 | 說明 |
|------|------|
| `pending` | 等待處理 |
| `processing` | 處理中 |
| `completed` | 完成 |
| `failed` | 失敗 |

**回應 (200) - 完成**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "original_filename": "video.mp4",
  "source_format": "mp4",
  "target_format": "webm",
  "engine": "ffmpeg",
  "download_url": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/download",
  "created_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:01:30Z"
}
```

**回應 (200) - 失敗**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "original_filename": "corrupted.mp4",
  "source_format": "mp4",
  "target_format": "webm",
  "engine": "ffmpeg",
  "error_message": "Conversion failed: Invalid data found when processing input",
  "created_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:00:05Z"
}
```

---

#### `GET /api/v1/jobs/:job_id/download`

下載轉換後的檔案。

**前提條件**
- 任務狀態必須是 `completed`
- 只有任務建立者可以下載

**回應 Headers**
```
Content-Type: <mime-type>
Content-Disposition: attachment; filename="output.webm"
```

**錯誤回應**

| 狀況 | 錯誤碼 | HTTP 狀態 |
|------|--------|-----------|
| 任務未完成 | `BAD_REQUEST` | 400 |
| 無權限 | `UNAUTHORIZED` | 401 |
| 任務不存在 | `JOB_NOT_FOUND` | 404 |
| 檔案遺失 | `FILE_NOT_FOUND` | 404 |

---

#### `DELETE /api/v1/jobs/:job_id`

刪除任務及相關檔案。

**回應 (200)**

```json
{
  "message": "Job deleted successfully",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## GraphQL API 規格

### Endpoint

- **URL**: `http://localhost:3001/graphql`
- **Method**: POST
- **Content-Type**: `application/json`

GraphQL Playground 可透過 GET 請求訪問同一 URL。

### Schema

```graphql
# ========== Queries ==========

type Query {
  """健康檢查（不需認證）"""
  health: Health!
  
  """列出所有可用引擎"""
  engines: [Engine!]!
  
  """取得特定引擎"""
  engine(id: ID!): Engine
  
  """列出當前使用者的所有任務"""
  jobs: [Job!]!
  
  """取得特定任務"""
  job(id: ID!): Job
  
  """驗證轉換是否支援"""
  validateConversion(
    engine: String!
    from: String!
    to: String!
  ): CreateJobResult!
  
  """取得轉換建議"""
  suggestions(from: String!, to: String!): [Suggestion!]!
}

# ========== Mutations ==========

type Mutation {
  """建立轉檔任務"""
  createJob(
    filename: String!
    fileBase64: String!
    input: CreateJobInput!
  ): CreateJobResult!
  
  """刪除任務"""
  deleteJob(id: ID!): Boolean!
}

# ========== Input Types ==========

input CreateJobInput {
  """轉換引擎 ID"""
  engine: String!
  
  """目標格式"""
  targetFormat: String!
  
  """轉換選項（JSON 字串）"""
  options: String
}

# ========== Object Types ==========

type Health {
  status: String!
  version: String!
  timestamp: DateTime!
}

type Engine {
  id: ID!
  name: String!
  description: String!
  supportedInputFormats: [String!]!
  supportedOutputFormats: [String!]!
}

type Job {
  id: ID!
  originalFilename: String!
  sourceFormat: String!
  targetFormat: String!
  engine: String!
  status: JobStatus!
  outputFilename: String
  errorMessage: String
  downloadUrl: String
  createdAt: DateTime!
  completedAt: DateTime
}

type Suggestion {
  engine: String!
  from: String!
  to: String!
}

type CreateJobResult {
  success: Boolean!
  job: Job
  error: ConversionError
}

type ConversionError {
  code: String!
  message: String!
  suggestions: [Suggestion!]!
}

# ========== Enums ==========

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

# ========== Scalars ==========

scalar DateTime
```

### 使用範例

#### 列出所有引擎

```graphql
query {
  engines {
    id
    name
    description
    supportedInputFormats
    supportedOutputFormats
  }
}
```

#### 驗證轉換是否支援

```graphql
query {
  validateConversion(engine: "ffmpeg", from: "mp4", to: "webm") {
    success
    error {
      code
      message
      suggestions {
        engine
        from
        to
      }
    }
  }
}
```

#### 取得轉換建議

```graphql
query {
  suggestions(from: "pdf", to: "docx") {
    engine
    from
    to
  }
}
```

#### 建立轉檔任務

```graphql
mutation CreateConversionJob($filename: String!, $content: String!) {
  createJob(
    filename: $filename
    fileBase64: $content
    input: {
      engine: "imagemagick"
      targetFormat: "jpg"
    }
  ) {
    success
    job {
      id
      status
      originalFilename
    }
    error {
      code
      message
      suggestions {
        engine
        from
        to
      }
    }
  }
}
```

Variables:
```json
{
  "filename": "image.png",
  "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

#### 查詢任務狀態

```graphql
query {
  job(id: "550e8400-e29b-41d4-a716-446655440000") {
    id
    status
    originalFilename
    sourceFormat
    targetFormat
    engine
    downloadUrl
    errorMessage
    createdAt
    completedAt
  }
}
```

#### 列出所有任務

```graphql
query {
  jobs {
    id
    status
    originalFilename
    targetFormat
    downloadUrl
  }
}
```

#### 刪除任務

```graphql
mutation {
  deleteJob(id: "550e8400-e29b-41d4-a716-446655440000")
}
```

---

## 錯誤碼對照表

| 錯誤碼 | HTTP 狀態 | 說明 | 包含建議 |
|--------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 未授權存取 | ✗ |
| `INVALID_TOKEN` | 401 | Token 無效 | ✗ |
| `TOKEN_EXPIRED` | 401 | Token 已過期 | ✗ |
| `MISSING_AUTH_HEADER` | 401 | 缺少認證標頭 | ✗ |
| `BAD_REQUEST` | 400 | 請求格式錯誤 | ✗ |
| `INVALID_FILE` | 400 | 無法辨識檔案格式 | ✗ |
| `FILE_TOO_LARGE` | 400 | 檔案超過大小限制 | ✗ |
| `ENGINE_NOT_FOUND` | 404 | 引擎不存在 | ✗ |
| `JOB_NOT_FOUND` | 404 | 任務不存在 | ✗ |
| `FILE_NOT_FOUND` | 404 | 檔案不存在 | ✗ |
| `UNSUPPORTED_CONVERSION` | 422 | 不支援的轉換 | ✓ |
| `CONVERSION_FAILED` | 500 | 轉換失敗 | ✗ |
| `INTERNAL_ERROR` | 500 | 內部錯誤 | ✗ |
