#!/usr/bin/env bash
# ==============================================================================
# ConvertX-CN 模型下載腳本
# ==============================================================================
# 用途：下載所有 AI 模型（MinerU, BabelDOC, PDFMathTranslate）
# 執行環境：Docker build stage (models-download)
# 
# ⚠️ 重要：此腳本在 build time 執行，下載所有模型到固定目錄
#          Runtime 完全離線，不得有任何下載行為
# ==============================================================================

set -euo pipefail

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}📥 [INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠️ [WARN]${NC} $1"; }
log_error() { echo -e "${RED}❌ [ERROR]${NC} $1"; }

# 架構檢測
ARCH=$(uname -m)
log_info "檢測架構: ${ARCH}"

# ==============================================================================
# 目錄定義
# ==============================================================================
MODELS_BASE_DIR="/opt/convertx/models"
MINERU_MODELS_DIR="${MODELS_BASE_DIR}/mineru"
BABELDOC_CACHE_DIR="/root/.cache/babeldoc"
BABELDOC_MODELS_DIR="${BABELDOC_CACHE_DIR}/models"
BABELDOC_FONTS_DIR="${BABELDOC_CACHE_DIR}/fonts"
BABELDOC_CMAP_DIR="${BABELDOC_CACHE_DIR}/cmap"
BABELDOC_TIKTOKEN_DIR="${BABELDOC_CACHE_DIR}/tiktoken"

# ==============================================================================
# 創建目錄結構
# ==============================================================================
create_directories() {
    log_info "創建模型目錄結構..."
    
    mkdir -p "${MINERU_MODELS_DIR}"
    mkdir -p "${BABELDOC_MODELS_DIR}"
    mkdir -p "${BABELDOC_FONTS_DIR}"
    mkdir -p "${BABELDOC_CMAP_DIR}"
    mkdir -p "${BABELDOC_TIKTOKEN_DIR}"
    
    log_success "目錄結構創建完成"
}

# ==============================================================================
# 下載 MinerU Pipeline 模型
# ==============================================================================
download_mineru_models() {
    log_info "下載 MinerU Pipeline 模型..."
    
    if [ "${ARCH}" = "aarch64" ]; then
        log_warn "ARM64：跳過 MinerU 模型下載（不支援）"
        return 0
    fi
    
    python3 << 'PYTHON'
from huggingface_hub import snapshot_download
import os

models_dir = os.environ.get('MINERU_MODELS_DIR', '/opt/convertx/models/mineru')
print(f'下載 PDF-Extract-Kit-1.0 到 {models_dir}...')

try:
    snapshot_download(
        repo_id='opendatalab/PDF-Extract-Kit-1.0',
        local_dir=f'{models_dir}/PDF-Extract-Kit-1.0',
        local_dir_use_symlinks=False,
        resume_download=True
    )
    print('✅ PDF-Extract-Kit-1.0 下載完成')
except Exception as e:
    print(f'❌ 下載失敗: {e}')
    raise
PYTHON
    
    # 顯示模型大小
    log_info "MinerU 模型目錄內容:"
    du -sh "${MINERU_MODELS_DIR}/PDF-Extract-Kit-1.0" 2>/dev/null || true
    ls -la "${MINERU_MODELS_DIR}/" 2>/dev/null || true
    
    log_success "MinerU 模型下載完成"
}

# ==============================================================================
# 產生 MinerU 配置檔
# ==============================================================================
generate_mineru_config() {
    log_info "產生 MinerU 配置檔..."
    
    if [ "${ARCH}" = "aarch64" ]; then
        log_warn "ARM64：跳過 MinerU 配置"
        return 0
    fi
    
    python3 << 'PYTHON'
import json
import os

mineru_models_dir = os.environ.get('MINERU_MODELS_DIR', '/opt/convertx/models/mineru')

config = {
    'models-dir': {
        'pipeline': f'{mineru_models_dir}/PDF-Extract-Kit-1.0',
        'vlm': ''
    },
    'model-source': 'local',
    'latex-delimiter-config': {
        'display': {'left': '@@', 'right': '@@'},
        'inline': {'left': '@', 'right': '@'}
    }
}

# 寫入多個位置
config_paths = [
    '/opt/convertx/mineru.json',
    '/root/mineru.json'
]

for path in config_paths:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(config, f, indent=2)
    print(f'✅ 已產生: {path}')

print(json.dumps(config, indent=2))
PYTHON
    
    log_success "MinerU 配置檔產生完成"
}

# ==============================================================================
# BabelDOC warmup（下載所有資源）
# ==============================================================================
babeldoc_warmup() {
    log_info "執行 BabelDOC warmup..."
    
    export BABELDOC_CACHE_PATH="${BABELDOC_CACHE_DIR}"
    
    if command -v babeldoc >/dev/null 2>&1; then
        babeldoc --warmup 2>&1 || {
            log_warn "BabelDOC warmup 可能有警告，但繼續"
        }
        
        log_info "BabelDOC 快取內容:"
        ls -la "${BABELDOC_CACHE_DIR}/" 2>/dev/null || true
        du -sh "${BABELDOC_CACHE_DIR}/" 2>/dev/null || true
    else
        log_warn "babeldoc 不可用，跳過 warmup"
    fi
    
    log_success "BabelDOC warmup 完成"
}

# ==============================================================================
# 下載 tiktoken 編碼
# ==============================================================================
download_tiktoken() {
    log_info "下載 tiktoken 編碼..."
    
    python3 << 'PYTHON'
try:
    import tiktoken
    
    encodings = ['cl100k_base', 'p50k_base', 'r50k_base']
    
    for enc_name in encodings:
        try:
            enc = tiktoken.get_encoding(enc_name)
            print(f'✅ tiktoken {enc_name} 已下載')
        except Exception as e:
            print(f'⚠️ tiktoken {enc_name} 下載失敗: {e}')

except ImportError:
    print('⚠️ tiktoken 未安裝，跳過')
PYTHON
    
    log_success "tiktoken 編碼下載完成"
}

# ==============================================================================
# 複製預下載的 ONNX 模型（從 COPY 複製）
# ==============================================================================
setup_onnx_models() {
    log_info "設定 ONNX 模型..."
    
    # 如果有預下載的模型，複製到正確位置
    local ONNX_MODEL="doclayout_yolo_docstructbench_imgsz1024.onnx"
    local SRC_PATHS=(
        "/app/models/${ONNX_MODEL}"
        "/tmp/models/${ONNX_MODEL}"
    )
    
    for src in "${SRC_PATHS[@]}"; do
        if [ -f "${src}" ]; then
            cp "${src}" "${BABELDOC_MODELS_DIR}/"
            log_success "已複製 ONNX 模型: ${src} -> ${BABELDOC_MODELS_DIR}/"
            return 0
        fi
    done
    
    log_warn "未找到預下載的 ONNX 模型，將依賴 babeldoc --warmup"
}

# ==============================================================================
# 驗證下載結果
# ==============================================================================
verify_downloads() {
    log_info "驗證模型下載..."
    
    echo ""
    echo "模型目錄統計:"
    echo "=============================================="
    
    # MinerU
    if [ "${ARCH}" != "aarch64" ]; then
        if [ -d "${MINERU_MODELS_DIR}/PDF-Extract-Kit-1.0" ]; then
            local size
            size=$(du -sh "${MINERU_MODELS_DIR}/PDF-Extract-Kit-1.0" 2>/dev/null | awk '{print $1}')
            echo "  ✅ MinerU Pipeline: ${size}"
        else
            echo "  ❌ MinerU Pipeline: 不存在"
        fi
        
        if [ -f "/root/mineru.json" ]; then
            echo "  ✅ MinerU 配置檔: 已產生"
        else
            echo "  ❌ MinerU 配置檔: 不存在"
        fi
    else
        echo "  ⚠️ MinerU: ARM64 跳過"
    fi
    
    # BabelDOC
    if [ -d "${BABELDOC_CACHE_DIR}" ]; then
        local size
        size=$(du -sh "${BABELDOC_CACHE_DIR}" 2>/dev/null | awk '{print $1}')
        echo "  ✅ BabelDOC 快取: ${size}"
    else
        echo "  ⚠️ BabelDOC 快取: 不存在"
    fi
    
    # ONNX 模型
    if [ -f "${BABELDOC_MODELS_DIR}/doclayout_yolo_docstructbench_imgsz1024.onnx" ]; then
        local size
        size=$(ls -lh "${BABELDOC_MODELS_DIR}/doclayout_yolo_docstructbench_imgsz1024.onnx" | awk '{print $5}')
        echo "  ✅ DocLayout-YOLO ONNX: ${size}"
    else
        echo "  ⚠️ DocLayout-YOLO ONNX: 不存在"
    fi
    
    echo "=============================================="
    log_success "驗證完成"
}

# ==============================================================================
# 清理下載快取
# ==============================================================================
cleanup_cache() {
    log_info "清理下載快取..."
    
    rm -rf /tmp/hf_download_cache 2>/dev/null || true
    rm -rf /root/.cache/huggingface 2>/dev/null || true
    rm -rf /root/.cache/pip 2>/dev/null || true
    rm -rf /root/.cache/uv 2>/dev/null || true
    
    # 清理 Python cache
    find /usr -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    log_success "快取清理完成"
}

# ==============================================================================
# 主程式
# ==============================================================================
main() {
    log_info "=========================================="
    log_info "開始下載模型 (${ARCH})"
    log_info "=========================================="
    
    create_directories
    download_mineru_models
    generate_mineru_config
    setup_onnx_models
    babeldoc_warmup
    download_tiktoken
    verify_downloads
    cleanup_cache
    
    log_success "=========================================="
    log_success "所有模型下載完成！"
    log_success "=========================================="
}

# 執行
main "$@"
