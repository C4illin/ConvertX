# CI/CD

本文件說明 ConvertX-CN 的持續整合與持續部署設定。

---

## GitHub Actions

### 測試工作流

每次 Push 和 Pull Request 自動執行：

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run lint
        run: bun run lint

      - name: Run tests
        run: bun run test
```

### Docker 建構工作流

標籤推送時自動建構並發布 Docker 映像：

```yaml
# .github/workflows/docker.yml
name: Docker Build

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            convertx/convertx-cn:latest
            convertx/convertx-cn:${{ github.ref_name }}
```

---

## 工作流程

### 開發流程

```
1. 開發者提交 PR
   ↓
2. 自動執行測試
   ↓
3. 通過 Review
   ↓
4. 合併到 main
```

### 發布流程

```
1. 建立版本標籤 (v0.1.x)
   ↓
2. 自動建構 Docker 映像
   ↓
3. 推送到 Docker Hub
   ↓
4. 更新 latest 標籤
```

---

## 環境變數

### 測試環境

| 變數       | 說明        |
| ---------- | ----------- |
| `CI`       | CI 環境標記 |
| `NODE_ENV` | `test`      |

### Docker 建構

| 變數              | 說明             |
| ----------------- | ---------------- |
| `DOCKER_USERNAME` | Docker Hub 帳號  |
| `DOCKER_TOKEN`    | Docker Hub Token |

---

## 本地模擬 CI

### 執行完整檢查

```bash
# 模擬 CI 流程
bun run lint
bun run typecheck
bun run test
bun run build
```

### 建構 Docker 映像

```bash
docker build -t convertx-cn-test .
```

---

## 相關文件

- [測試策略](test-strategy.md)
- [E2E 測試](e2e-tests.md)
- [貢獻指南](../development/contribution.md)
