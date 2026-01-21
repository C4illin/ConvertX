# ConvertX API 架構說明

## 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Server                                │
│                                                                  │
│  ┌──────────────┐                                               │
│  │  Auth Layer  │◄──── JWT Token 驗證                           │
│  │   (JWT)      │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                   Request Router                      │       │
│  │                                                       │       │
│  │   ┌─────────────┐         ┌──────────────────┐       │       │
│  │   │  REST API   │         │   GraphQL API    │       │       │
│  │   │ /api/v1/*   │         │    /graphql      │       │       │
│  │   └──────┬──────┘         └────────┬─────────┘       │       │
│  │          │                         │                  │       │
│  └──────────┼─────────────────────────┼──────────────────┘       │
│             │                         │                          │
│             └────────────┬────────────┘                          │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │  Conversion Service   │                          │
│              │    (Domain Logic)     │                          │
│              │                       │                          │
│              │  ┌─────────────────┐  │                          │
│              │  │ Engine Registry │  │                          │
│              │  └─────────────────┘  │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   External Converters │                          │
│              │   (FFmpeg, etc.)      │                          │
│              └───────────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │    File Storage       │
                │  ┌─────────────────┐  │
                │  │ data/uploads/   │  │
                │  │ data/output/    │  │
                │  └─────────────────┘  │
                └───────────────────────┘
```

## 模組說明

### 1. Auth Layer (`src/auth.rs`)

負責所有請求的 JWT 驗證。

**職責**：

- 解析 Authorization Header
- 驗證 JWT Token 簽名
- 檢查 Token 是否過期
- 提取使用者資訊

**不負責**：

- 產生 JWT Token（由外部認證服務處理）
- 使用者管理

### 2. REST API (`src/rest.rs`)

提供 RESTful HTTP 端點。

**端點**：

- `GET /health` - 健康檢查
- `GET /api/v1/engines` - 列出引擎
- `POST /api/v1/convert` - 建立轉檔任務
- `GET /api/v1/jobs` - 列出任務
- `GET /api/v1/jobs/:id` - 取得任務狀態
- `GET /api/v1/jobs/:id/download` - 下載結果
- `DELETE /api/v1/jobs/:id` - 刪除任務

### 3. GraphQL API (`src/graphql.rs`)

提供 GraphQL 查詢與變更。

**Queries**：

- `health` - 健康檢查
- `engines` - 列出引擎
- `engine(id)` - 取得特定引擎
- `jobs` - 列出任務
- `job(id)` - 取得特定任務
- `validateConversion` - 驗證轉換
- `suggestions` - 取得建議

**Mutations**：

- `createJob` - 建立任務
- `deleteJob` - 刪除任務

### 4. Engine Registry (`src/engine.rs`)

管理所有可用的轉換引擎及其能力。

**職責**：

- 註冊引擎及其支援的格式
- 驗證轉換是否可行
- 提供替代方案建議

**設計原則**：

- 引擎必須明確指定，不自動選擇
- 不支援的轉換必須回傳建議

### 5. Conversion Service (`src/conversion.rs`)

處理轉檔任務的核心邏輯。

**職責**：

- 建立和管理轉檔任務
- 儲存上傳的檔案
- 呼叫外部轉換程式
- 管理輸出檔案

### 6. Error Handling (`src/error.rs`)

統一的錯誤處理機制。

**特色**：

- 結構化的錯誤回應
- 錯誤碼分類
- 轉換建議整合

## 資料流程

### 轉檔請求流程

```
Client Request
      │
      ▼
┌─────────────────┐
│ JWT Validation  │ ──────► 401 Unauthorized
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│ Parse Request   │ ──────► 400 Bad Request
│ (file, engine,  │
│  target_format) │
└────────┬────────┘
         │ Valid
         ▼
┌─────────────────┐
│ Validate        │ ──────► 422 Unsupported
│ Conversion      │         (with suggestions)
│ (Engine Registry)│
└────────┬────────┘
         │ Supported
         ▼
┌─────────────────┐
│ Create Job      │
│ Save File       │
│ Start Conversion│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 201 Created     │
│ Return Job ID   │
└─────────────────┘
```

### 轉換執行流程

```
Background Task
      │
      ▼
┌─────────────────┐
│ Update Status   │
│ → Processing    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute         │
│ Converter       │
│ Command         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │Failed │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Update │ │Update │
│Status │ │Status │
│=Done  │ │=Failed│
└───────┘ └───────┘
```

## 設計決策

### 1. 為什麼使用 Rust？

- **效能**：處理大量並發請求時表現優異
- **記憶體安全**：避免常見的記憶體問題
- **非同步支援**：Tokio 生態系統成熟
- **類型安全**：編譯時檢查減少運行時錯誤

### 2. 為什麼同時支援 REST 和 GraphQL？

- **REST**：簡單直觀，適合檔案上傳/下載
- **GraphQL**：靈活查詢，減少 over-fetching
- **獨立使用**：使用者可選擇適合的 API

### 3. 為什麼採用「結果僅透過 API 下載」策略？

- **安全性**：不暴露檔案系統路徑
- **權限控制**：下載時驗證身份
- **彈性部署**：易於整合 CDN 或雲端儲存
- **可擴展性**：未來可改用分散式儲存

### 4. 為什麼引擎必須明確指定？

- **可預測性**：使用者明確知道使用什麼工具
- **一致性**：避免因自動選擇導致的結果差異
- **透明度**：錯誤時能明確指出是哪個引擎的問題

## 擴展指南

### 新增轉換引擎

1. 在 `src/engine.rs` 的 `register_default_engines()` 中新增：

```rust
let new_engine = Engine::new(
    "engine_id",
    "Engine Name",
    "Engine description"
)
.add_conversion("input_format", vec!["output1", "output2"]);
self.register(new_engine);
```

2. 在 `src/conversion.rs` 的 `run_converter_command()` 中新增命令：

```rust
"engine_id" => (
    "command",
    vec!["arg1".to_string(), input, output],
),
```

### 新增 REST 端點

在 `src/rest.rs` 中：

```rust
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/v1/new-endpoint", get(new_handler))
        // ...
}

async fn new_handler(
    State(state): State<AppState>,
    RequireAuth(user): RequireAuth,
) -> ApiResult<impl IntoResponse> {
    // ...
}
```

### 新增 GraphQL 查詢/變更

在 `src/graphql.rs` 中：

```rust
#[Object]
impl QueryRoot {
    async fn new_query(&self, ctx: &Context<'_>) -> GqlResult<SomeType> {
        let _user = validate_auth(ctx)?;
        // ...
    }
}

#[Object]
impl MutationRoot {
    async fn new_mutation(&self, ctx: &Context<'_>, input: Input) -> GqlResult<Output> {
        let user = validate_auth(ctx)?;
        // ...
    }
}
```

## 效能考量

### 並發處理

- 使用 Tokio 非同步運行時
- 轉換任務在背景執行
- 任務狀態儲存在記憶體（生產環境應使用資料庫）

### 檔案處理

- 大檔案直接寫入磁碟，不佔用過多記憶體
- 輸出檔案串流下載

### 未來優化方向

1. 使用 Redis 進行任務佇列
2. 使用 PostgreSQL 進行任務持久化
3. 實作任務優先級
4. 新增任務取消功能
5. 實作 Webhook 回呼
