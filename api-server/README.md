# ConvertX API Server

一個使用 Rust 實作的 REST 與 GraphQL 檔案轉換 API 伺服器。

## 🎯 功能特色

- **雙 API 支援**: 同時提供 REST API 和 GraphQL API，兩者完全獨立運作
- **JWT 認證**: 所有 API 請求都需要 JWT Bearer Token 驗證
- **多引擎支援**: 整合 20+ 種轉換引擎（FFmpeg、ImageMagick、LibreOffice 等）
- **智慧建議**: 當轉換不支援時，自動回傳可用的替代方案
- **完整測試**: 包含單元測試和 API 整合測試

## 🏗️ 系統架構

```
API Server
├─ Auth Layer (JWT 驗證)
├─ REST API (/api/v1/*)
├─ GraphQL API (/graphql)
└─ Conversion Service (Domain Logic)
    └─ Engine Registry (轉換引擎管理)
```

### 設計原則

- **API Server 只負責**:
  - 驗證 JWT
  - 驗證請求是否合法
  - 建立轉檔任務
  - 呼叫轉檔引擎
  - 回傳結果 / 錯誤 / 建議

- **轉換引擎必須明確指定**: 使用者必須指定要使用的引擎，系統不會自動選擇

## 🚀 快速開始

### 環境需求

- Rust 1.75+
- 對應的轉換工具（FFmpeg、ImageMagick 等，視需求安裝）

### 安裝與執行

```bash
# 進入 API Server 目錄
cd api-server

# 編譯
cargo build --release

# 執行
cargo run --release
```

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `API_HOST` | 伺服器監聽地址 | `0.0.0.0` |
| `API_PORT` | 伺服器監聽埠 | `3001` |
| `JWT_SECRET` | JWT 驗證密鑰 | (預設值，正式環境請更改) |
| `UPLOAD_DIR` | 上傳檔案目錄 | `./data/uploads` |
| `OUTPUT_DIR` | 輸出檔案目錄 | `./data/output` |
| `MAX_FILE_SIZE` | 最大檔案大小（bytes） | `104857600` (100MB) |

### 範例 .env 檔案

```env
API_HOST=0.0.0.0
API_PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
UPLOAD_DIR=./data/uploads
OUTPUT_DIR=./data/output
MAX_FILE_SIZE=104857600
```

## 🔐 認證機制

所有 API 請求（除了健康檢查）都需要 JWT Bearer Token：

```
Authorization: Bearer <your-jwt-token>
```

### JWT Claims 結構

```json
{
  "sub": "user-id",
  "exp": 1234567890,
  "iat": 1234567890,
  "email": "user@example.com",
  "roles": ["user"]
}
```

**注意**: API Server 只負責驗證 JWT，不負責產生 JWT。Token 應由獨立的認證服務產生。

## 📖 REST API

### 基礎 URL

```
http://localhost:3001/api/v1
```

### Endpoints

#### 健康檢查

```http
GET /health
GET /api/v1/health
```

回應：
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 列出所有引擎

```http
GET /api/v1/engines
Authorization: Bearer <token>
```

回應：
```json
{
  "engines": [
    {
      "id": "ffmpeg",
      "name": "FFmpeg",
      "description": "Audio and video conversion using FFmpeg",
      "supported_input_formats": ["mp4", "webm", "avi", ...],
      "supported_output_formats": ["mp4", "webm", "mp3", ...]
    }
  ]
}
```

#### 取得特定引擎資訊

```http
GET /api/v1/engines/:engine_id
Authorization: Bearer <token>
```

#### 建立轉檔任務

```http
POST /api/v1/convert
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

表單欄位：
- `file`: 要轉換的檔案（必填）
- `engine`: 轉換引擎 ID（必填）
- `target_format`: 目標格式（必填）
- `options`: JSON 格式的選項（選填）

回應：
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Conversion job created successfully"
}
```

#### 列出使用者的任務

```http
GET /api/v1/jobs
Authorization: Bearer <token>
```

#### 取得任務狀態

```http
GET /api/v1/jobs/:job_id
Authorization: Bearer <token>
```

回應：
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "original_filename": "video.mp4",
  "source_format": "mp4",
  "target_format": "webm",
  "engine": "ffmpeg",
  "download_url": "/api/v1/jobs/550e8400-.../download",
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:01:00Z"
}
```

#### 下載轉換結果

```http
GET /api/v1/jobs/:job_id/download
Authorization: Bearer <token>
```

#### 刪除任務

```http
DELETE /api/v1/jobs/:job_id
Authorization: Bearer <token>
```

### cURL 範例

```bash
# 健康檢查
curl http://localhost:3001/health

# 列出引擎
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/engines

# 建立轉檔任務
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@video.mp4" \
  -F "engine=ffmpeg" \
  -F "target_format=webm" \
  http://localhost:3001/api/v1/convert

# 查詢任務狀態
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/jobs/$JOB_ID

# 下載結果
curl -H "Authorization: Bearer $TOKEN" \
  -o result.webm \
  http://localhost:3001/api/v1/jobs/$JOB_ID/download
```

## 📊 GraphQL API

### Endpoint

```
http://localhost:3001/graphql
```

GraphQL Playground 可透過瀏覽器訪問 `http://localhost:3001/graphql`

### Schema

#### Queries

```graphql
type Query {
  # 健康檢查（不需認證）
  health: Health!
  
  # 列出所有引擎
  engines: [Engine!]!
  
  # 取得特定引擎
  engine(id: ID!): Engine
  
  # 列出使用者的任務
  jobs: [Job!]!
  
  # 取得特定任務
  job(id: ID!): Job
  
  # 驗證轉換是否支援
  validateConversion(engine: String!, from: String!, to: String!): CreateJobResult!
  
  # 取得轉換建議
  suggestions(from: String!, to: String!): [Suggestion!]!
}
```

#### Mutations

```graphql
type Mutation {
  # 建立轉檔任務
  createJob(
    filename: String!
    fileBase64: String!
    input: CreateJobInput!
  ): CreateJobResult!
  
  # 刪除任務
  deleteJob(id: ID!): Boolean!
}

input CreateJobInput {
  engine: String!
  targetFormat: String!
  options: String
}
```

#### Types

```graphql
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

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
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
```

### GraphQL 範例

```graphql
# 列出所有引擎
query {
  engines {
    id
    name
    supportedInputFormats
    supportedOutputFormats
  }
}

# 驗證轉換是否支援
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

# 建立轉檔任務
mutation {
  createJob(
    filename: "video.mp4"
    fileBase64: "base64-encoded-content"
    input: {
      engine: "ffmpeg"
      targetFormat: "webm"
    }
  ) {
    success
    job {
      id
      status
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

# 查詢任務
query {
  jobs {
    id
    status
    originalFilename
    downloadUrl
  }
}
```

## ❌ 錯誤處理

### 錯誤回應格式

```json
{
  "error": {
    "code": "UNSUPPORTED_CONVERSION",
    "message": "Conversion from pdf to mp4 is not supported by engine ffmpeg",
    "suggestions": [
      {
        "engine": "libreoffice",
        "from": "pdf",
        "to": "docx"
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

### 錯誤碼

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未授權 |
| `INVALID_TOKEN` | 401 | Token 格式或簽名無效 |
| `TOKEN_EXPIRED` | 401 | Token 已過期 |
| `MISSING_AUTH_HEADER` | 401 | 缺少 Authorization 標頭 |
| `BAD_REQUEST` | 400 | 請求格式錯誤 |
| `INVALID_FILE` | 400 | 檔案格式無法辨識 |
| `FILE_TOO_LARGE` | 400 | 檔案超過大小限制 |
| `ENGINE_NOT_FOUND` | 404 | 指定的引擎不存在 |
| `JOB_NOT_FOUND` | 404 | 任務不存在 |
| `FILE_NOT_FOUND` | 404 | 檔案不存在 |
| `UNSUPPORTED_CONVERSION` | 422 | 不支援的轉換（附帶建議） |
| `CONVERSION_FAILED` | 500 | 轉換過程失敗 |
| `INTERNAL_ERROR` | 500 | 內部錯誤 |

## 📦 轉換結果策略

本 API Server 採用 **選項 B：結果僅透過 API 提供下載**

### 設計理由

1. **安全性**: 不暴露實體檔案路徑，避免路徑遍歷攻擊
2. **權限控制**: 下載時驗證 JWT，確保只有任務擁有者能下載
3. **彈性部署**: 適合雲端環境，可輕易整合 CDN 或物件儲存
4. **清理管理**: 方便實作自動清理過期檔案的機制

### 檔案儲存

內部儲存結構：
```
data/
├── uploads/
│   └── <job_id>/
│       └── <original_filename>
└── output/
    └── <job_id>/
        └── <converted_filename>
```

使用者透過 `/api/v1/jobs/{job_id}/download` 下載，API 會驗證權限後串流檔案。

## 🔧 支援的轉換引擎

| 引擎 ID | 名稱 | 說明 |
|---------|------|------|
| `ffmpeg` | FFmpeg | 音視頻轉換 |
| `imagemagick` | ImageMagick | 圖片格式轉換 |
| `graphicsmagick` | GraphicsMagick | 圖片格式轉換（替代方案） |
| `libreoffice` | LibreOffice | 辦公文件轉換 |
| `pandoc` | Pandoc | 文件/標記語言轉換 |
| `calibre` | Calibre | 電子書轉換 |
| `inkscape` | Inkscape | 向量圖轉換 |
| `resvg` | resvg | SVG 渲染 |
| `vips` | libvips | 高效能圖片處理 |
| `libheif` | libheif | HEIF/HEIC 轉換 |
| `libjxl` | libjxl | JPEG XL 轉換 |
| `potrace` | Potrace | 點陣圖轉向量 |
| `vtracer` | VTracer | 進階向量化 |
| `dasel` | Dasel | 資料格式轉換 |
| `assimp` | Assimp | 3D 模型轉換 |
| `xelatex` | XeLaTeX | LaTeX 編譯 |
| `dvisvgm` | dvisvgm | DVI 轉 SVG |
| `msgconvert` | msgconvert | Outlook MSG 轉 EML |
| `vcf` | VCF Converter | vCard 轉換 |
| `markitdown` | MarkItDown | 文件轉 Markdown |

## 🧪 測試

```bash
# 執行所有測試
cargo test

# 執行特定測試
cargo test auth_tests
cargo test graphql_tests

# 顯示測試輸出
cargo test -- --nocapture
```

## 📁 專案結構

```
api-server/
├── Cargo.toml
├── src/
│   ├── main.rs          # 程式入口
│   ├── lib.rs           # 函式庫模組
│   ├── config.rs        # 設定管理
│   ├── auth.rs          # JWT 認證
│   ├── error.rs         # 錯誤處理
│   ├── models.rs        # 資料模型
│   ├── engine.rs        # 引擎註冊
│   ├── conversion.rs    # 轉換服務
│   ├── rest.rs          # REST API
│   └── graphql.rs       # GraphQL API
└── tests/
    ├── api_tests.rs     # REST API 測試
    └── graphql_tests.rs # GraphQL 測試
```

## 📄 授權

MIT License
