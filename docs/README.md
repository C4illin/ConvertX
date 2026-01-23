# ConvertX-CN 文件中心

歡迎來到 ConvertX-CN 文件！選擇您的角色快速找到所需資訊。

---

## 🚀 快速入門

剛開始使用？從這裡開始：

1. **[概覽](getting-started/overview.md)** — 了解 ConvertX-CN 是什麼
2. **[快速開始](getting-started/quick-start.md)** — 5 分鐘內完成部署
3. **[常見問題](getting-started/faq.md)** — 解決常見問題

---

## 👤 使用者指南

適合一般使用者：

| 文件                                       | 說明                 |
| ------------------------------------------ | -------------------- |
| [快速開始](getting-started/quick-start.md) | 最快部署方式         |
| [支援的轉換器](features/converters.md)     | 所有可用的轉換格式   |
| [OCR 功能](features/ocr.md)                | 光學字元辨識         |
| [翻譯功能](features/translation.md)        | PDF 翻譯（保留公式） |
| [多語言介面](features/i18n.md)             | 切換介面語言         |
| [常見問題](getting-started/faq.md)         | FAQ                  |

---

## 🛠️ 系統管理員指南

適合部署與維護人員：

### 部署

| 文件                                    | 說明                        |
| --------------------------------------- | --------------------------- |
| [Docker 部署](deployment/docker.md)     | Docker Run & Docker Compose |
| [反向代理](deployment/reverse-proxy.md) | Nginx / Traefik / Caddy     |
| [範例配置](samples/README.md)           | 可直接使用的配置檔          |

### 配置

| 文件                                               | 說明               |
| -------------------------------------------------- | ------------------ |
| [環境變數](configuration/environment-variables.md) | 所有可用設定       |
| [安全性設定](configuration/security.md)            | HTTPS、認證、防護  |
| [清理與限制](configuration/limits-and-cleanup.md)  | 自動清理、資源限制 |

---

## 👩‍💻 開發者指南

適合貢獻者與擴充開發：

### 開發

| 文件                                         | 說明           |
| -------------------------------------------- | -------------- |
| [專案結構](development/project-structure.md) | 程式碼結構說明 |
| [本地開發](development/local-development.md) | 開發環境設定   |
| [貢獻指南](development/contribution.md)      | 如何參與專案   |

### API

| 文件                         | 說明               |
| ---------------------------- | ------------------ |
| [API 總覽](api/overview.md)  | REST & GraphQL API |
| [API 端點](api/endpoints.md) | 詳細端點說明       |

### 測試

| 文件                                 | 說明           |
| ------------------------------------ | -------------- |
| [測試策略](testing/test-strategy.md) | 測試類型與方法 |
| [CI/CD](testing/ci-cd.md)            | 持續整合設定   |
| [E2E 測試](testing/e2e-tests.md)     | 端對端測試     |

---

## 📁 文件結構

```
docs/
├── README.md                          ← 您在這裡
├── getting-started/                   # 快速入門
│   ├── overview.md                    # 概覽
│   ├── quick-start.md                 # 快速開始
│   └── faq.md                         # 常見問題
├── deployment/                        # 部署指南
│   ├── docker.md                      # Docker 部署
│   └── reverse-proxy.md               # 反向代理
├── configuration/                     # 配置設定
│   ├── environment-variables.md       # 環境變數
│   ├── security.md                    # 安全性
│   └── limits-and-cleanup.md          # 清理與限制
├── features/                          # 功能說明
│   ├── converters.md                  # 轉換器
│   ├── translation.md                 # 翻譯
│   ├── ocr.md                         # OCR
│   └── i18n.md                        # 多語言
├── api/                               # API 文件
│   ├── overview.md                    # API 總覽
│   └── endpoints.md                   # API 端點
├── testing/                           # 測試
│   ├── test-strategy.md               # 測試策略
│   ├── ci-cd.md                       # CI/CD
│   └── e2e-tests.md                   # E2E 測試
├── development/                       # 開發指南
│   ├── project-structure.md           # 專案結構
│   ├── local-development.md           # 本地開發
│   └── contribution.md                # 貢獻指南
└── samples/                           # 範例檔案
    ├── compose.minimal.yml            # 最小配置
    ├── compose.production.yml         # 生產環境
    ├── compose.with-traefik.yml       # Traefik 整合
    └── nginx.example.conf             # Nginx 設定
```

---

## 🔗 快速連結

- 📦 [GitHub Repo](https://github.com/pi-docket/ConvertX-CN)
- 🐛 [Issues](https://github.com/pi-docket/ConvertX-CN/issues)
- 💬 [Discussions](https://github.com/pi-docket/ConvertX-CN/discussions)
- 📝 [Changelog](../CHANGELOG.md)
- 📄 [License](../LICENSE)

---

## 📖 閱讀路徑建議

### 我是新手

1. [概覽](getting-started/overview.md)
2. [快速開始](getting-started/quick-start.md)
3. [支援的轉換器](features/converters.md)

### 我要部署到生產環境

1. [Docker 部署](deployment/docker.md)
2. [反向代理](deployment/reverse-proxy.md)
3. [安全性設定](configuration/security.md)
4. [環境變數](configuration/environment-variables.md)

### 我想參與開發

1. [專案結構](development/project-structure.md)
2. [本地開發](development/local-development.md)
3. [貢獻指南](development/contribution.md)
4. [測試策略](testing/test-strategy.md)

---

## 🌐 多語言文件

此文件以繁體中文為主，我們也提供其他語言版本：

| 語言                             | 說明                  | 狀態      |
| -------------------------------- | --------------------- | --------- |
| [English](i18n/en/README.md)     | English documentation | 🔄 進行中 |
| [简体中文](i18n/zh-CN/README.md) | 简体中文文档          | 📋 規劃中 |
| [日本語](i18n/ja/README.md)      | 日本語ドキュメント    | 📋 規劃中 |

> 📝 **想幫忙翻譯？** 請參閱 [翻譯指南](i18n/README.md)

---

> 💡 **找不到您需要的資訊？** 歡迎到 [GitHub Discussions](https://github.com/pi-docket/ConvertX-CN/discussions) 發問！
