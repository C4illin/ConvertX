---
name: Upstream Sync Report
about: Auto-generated report for upstream sync
title: '🔄 Upstream Sync: {{ date | date("YYYY-MM-DD") }}'
labels: upstream-sync, automated
assignees: ""
---

## 🔄 Upstream 自動同步報告

**同步日期:** {{ date }}
**新 Commits:** {{ commit_count }}

### 📝 變更摘要

```
{{ commits_list }}
```

### 🐳 Docker Image

- **Tag:** `upstream-{{ date_tag }}`
- **Smoke Test:** {{ smoke_test_status }}

### ⏳ 後續動作

- [ ] 檢視變更內容
- [ ] 確認 smoke test 結果
- [ ] 決定是否 merge 到 main

---

_此 Issue 由 GitHub Actions 自動建立_
