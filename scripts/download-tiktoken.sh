#!/bin/bash
# ==============================================================================
# tiktoken 編碼下載腳本
# 用於 Docker build 階段預下載 tiktoken 編碼
# ==============================================================================

set -e

echo "📦 下載 tiktoken 編碼..."

python3 <<'PYTHON'
try:
    import tiktoken
    for enc_name in ['cl100k_base', 'p50k_base', 'r50k_base']:
        try:
            enc = tiktoken.get_encoding(enc_name)
            print(f'✅ tiktoken {enc_name} 已下載')
        except Exception as e:
            print(f'⚠️ tiktoken {enc_name} 下載失敗: {e}')
except ImportError:
    print('⚠️ tiktoken 未安裝，跳過')
PYTHON

echo "✅ tiktoken 編碼下載完成"
