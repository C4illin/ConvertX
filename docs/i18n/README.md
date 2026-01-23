# 多語言文件支援（Internationalization）

本目錄包含 ConvertX-CN 文件的多語言翻譯版本。

---

## 支援語言

| 語言代碼 | 語言     | 狀態        | 維護者   |
| -------- | -------- | ----------- | -------- |
| `zh-TW`  | 繁體中文 | ✅ 主要語言 | 核心團隊 |
| `en`     | English  | 🚧 進行中   | 待招募   |
| `zh-CN`  | 简体中文 | 📋 計畫中   | 待招募   |
| `ja`     | 日本語   | 📋 計畫中   | 待招募   |

---

## 目錄結構

```
docs/
├── README.md                    # 繁體中文（主要語言）
├── getting-started/             # 繁體中文文件
├── deployment/
├── configuration/
├── ...
└── i18n/                        # 多語言翻譯
    ├── README.md                # 本文件
    ├── en/                      # English
    │   ├── README.md
    │   ├── getting-started/
    │   └── ...
    ├── zh-CN/                   # 简体中文
    │   └── ...
    └── ja/                      # 日本語
        └── ...
```

---

## 翻譯指南

### 翻譯優先順序

1. **核心文件**（優先翻譯）
   - `README.md`（文件總覽）
   - `getting-started/quick-start.md`
   - `getting-started/faq.md`

2. **重要文件**
   - `deployment/docker.md`
   - `configuration/environment-variables.md`
   - `features/converters.md`

3. **進階文件**
   - 其他所有文件

### 翻譯規範

1. **保持結構一致**：翻譯後的檔案結構應與原文相同
2. **保留技術術語**：專有名詞可保留英文（如 Docker、API）
3. **更新連結**：確保所有連結指向正確的翻譯版本
4. **標註翻譯狀態**：在文件開頭標註翻譯版本與日期

### 翻譯檔案範本

```markdown
# 文件標題

> 🌐 **翻譯資訊**
>
> - 原文：[繁體中文版](../../getting-started/quick-start.md)
> - 翻譯版本：v0.1.0
> - 最後更新：2026-01-23
> - 翻譯者：@username

---

（翻譯內容）
```

---

## 如何貢獻翻譯

### 1. 選擇要翻譯的文件

查看 [翻譯進度追蹤](#翻譯進度追蹤) 確認哪些文件需要翻譯。

### 2. Fork 專案

```bash
git clone https://github.com/YOUR_USERNAME/ConvertX-CN.git
cd ConvertX-CN
```

### 3. 建立翻譯檔案

```bash
# 例如：翻譯 quick-start.md 為英文
mkdir -p docs/i18n/en/getting-started
cp docs/getting-started/quick-start.md docs/i18n/en/getting-started/
```

### 4. 進行翻譯

編輯檔案，翻譯內容並加上翻譯資訊標頭。

### 5. 提交 Pull Request

```bash
git add .
git commit -m "docs(i18n): add English translation for quick-start.md"
git push origin feature/en-quick-start
```

---

## 翻譯進度追蹤

### English (en)

| 文件                                   | 狀態      | 翻譯者 |
| -------------------------------------- | --------- | ------ |
| README.md                              | 🚧 進行中 | -      |
| getting-started/overview.md            | ⬜ 未開始 | -      |
| getting-started/quick-start.md         | ⬜ 未開始 | -      |
| getting-started/faq.md                 | ⬜ 未開始 | -      |
| deployment/docker.md                   | ⬜ 未開始 | -      |
| deployment/reverse-proxy.md            | ⬜ 未開始 | -      |
| configuration/environment-variables.md | ⬜ 未開始 | -      |
| configuration/security.md              | ⬜ 未開始 | -      |
| features/converters.md                 | ⬜ 未開始 | -      |

**圖例：** ✅ 完成 | 🚧 進行中 | ⬜ 未開始

---

## 語言切換

### 在文件中加入語言切換

每個翻譯文件的開頭可以加入語言切換連結：

```markdown
> 🌐 **Language / 語言**
> [繁體中文](../../README.md) | [English](README.md) | [简体中文](../zh-CN/README.md)
```

---

## 相關資源

- [貢獻指南](../development/contribution.md)
- [GitHub Issues - 翻譯](https://github.com/pi-docket/ConvertX-CN/labels/translation)
- [Discussions - 翻譯討論](https://github.com/pi-docket/ConvertX-CN/discussions/categories/translations)

---

## 致謝

感謝所有翻譯貢獻者！

<!-- 翻譯貢獻者名單將在此更新 -->
