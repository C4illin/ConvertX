#!/bin/bash
# ==============================================================================
# MinerU 模型下載腳本
# 用於 Docker build 階段下載 PDF-Extract-Kit-1.0
# ==============================================================================

set -e

ARCH=$(uname -m)
MODELS_DIR="${MINERU_MODELS_DIR:-/opt/convertx/models/mineru}"

if [ "$ARCH" = "aarch64" ]; then
    echo "⚠️ ARM64：跳過 MinerU 模型下載"
    exit 0
fi

echo "📦 下載 MinerU PDF-Extract-Kit-1.0 到 ${MODELS_DIR}..."

python3 <<'PYTHON'
from huggingface_hub import snapshot_download
import os

models_dir = os.environ.get('MINERU_MODELS_DIR', '/opt/convertx/models/mineru')
print(f'下載 PDF-Extract-Kit-1.0 到 {models_dir}...')

snapshot_download(
    repo_id='opendatalab/PDF-Extract-Kit-1.0',
    local_dir=f'{models_dir}/PDF-Extract-Kit-1.0',
    local_dir_use_symlinks=False,
    resume_download=True
)

print('✅ PDF-Extract-Kit-1.0 下載完成')
PYTHON

echo "✅ MinerU 模型下載完成"
