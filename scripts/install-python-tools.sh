#!/usr/bin/env bash
# ==============================================================================
# ConvertX-CN Python 工具安裝腳本
# ==============================================================================
# 用途：安裝所有 Python CLI 工具
# 執行環境：Docker build stage (python-tools)
# ==============================================================================

set -euo pipefail

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}🐍 [INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠️ [WARN]${NC} $1"; }
log_error() { echo -e "${RED}❌ [ERROR]${NC} $1"; }

# 架構檢測
ARCH=$(uname -m)
log_info "檢測架構: ${ARCH}"

# ==============================================================================
# Python 基礎環境
# ==============================================================================
install_python_base() {
    log_info "安裝 Python 基礎環境..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        python3-numpy \
        python3-tinycss2 \
        python3-opencv \
        python3-img2pdf
    rm -rf /var/lib/apt/lists/*
    log_success "Python 基礎環境安裝完成: $(python3 --version)"
}

# ==============================================================================
# uv 套件管理器
# ==============================================================================
install_uv() {
    log_info "安裝 uv 套件管理器..."
    pip3 install --no-cache-dir --break-system-packages uv
    log_success "uv 安裝完成: $(uv --version)"
}

# ==============================================================================
# huggingface_hub（模型下載）
# ==============================================================================
install_huggingface_hub() {
    log_info "安裝 huggingface_hub..."
    uv pip install --system --break-system-packages --no-cache huggingface_hub
    log_success "huggingface_hub 安裝完成"
}

# ==============================================================================
# endesive（PDF 簽章）
# ==============================================================================
install_endesive() {
    log_info "安裝 endesive（PDF 簽章）..."
    
    # endesive 需要編譯依賴
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        build-essential \
        swig \
        libpcsclite-dev \
        python3-dev
    
    uv pip install --system --break-system-packages --no-cache endesive
    
    # 清理編譯依賴
    apt-get remove -y build-essential swig python3-dev
    apt-get autoremove -y
    rm -rf /var/lib/apt/lists/*
    
    log_success "endesive 安裝完成"
}

# ==============================================================================
# markitdown
# ==============================================================================
install_markitdown() {
    log_info "安裝 markitdown..."
    uv pip install --system --break-system-packages --no-cache "markitdown[all]"
    log_success "markitdown 安裝完成"
}

# ==============================================================================
# pdf2zh（PDFMathTranslate）
# ==============================================================================
install_pdf2zh() {
    log_info "安裝 pdf2zh..."
    uv pip install --system --break-system-packages --no-cache pdf2zh
    
    if command -v pdf2zh >/dev/null 2>&1; then
        log_success "pdf2zh 安裝完成"
    else
        log_warn "pdf2zh 可能安裝到非標準路徑"
    fi
}

# ==============================================================================
# babeldoc
# ==============================================================================
install_babeldoc() {
    log_info "安裝 babeldoc..."
    uv pip install --system --break-system-packages --no-cache babeldoc || {
        log_warn "babeldoc 安裝可能有警告，但繼續"
    }
    
    if command -v babeldoc >/dev/null 2>&1; then
        log_success "babeldoc 安裝完成"
    else
        log_warn "babeldoc 可能安裝到非標準路徑"
    fi
}

# ==============================================================================
# MinerU
# ==============================================================================
install_mineru() {
    log_info "安裝 MinerU..."
    
    if [ "${ARCH}" = "aarch64" ]; then
        log_warn "ARM64：MinerU 不完全支援，跳過安裝"
        return 0
    fi
    
    # 使用 system-level 安裝
    uv pip install --system --break-system-packages --no-cache -U "mineru[all]"
    
    # 驗證安裝
    if command -v mineru >/dev/null 2>&1; then
        log_success "MinerU 安裝完成: $(which mineru)"
        mineru --version 2>/dev/null || log_info "(版本資訊可能不可用)"
    else
        log_warn "MinerU 可能安裝到非標準路徑"
    fi
}

# ==============================================================================
# tiktoken（BabelDOC 依賴）
# ==============================================================================
install_tiktoken() {
    log_info "安裝 tiktoken..."
    uv pip install --system --break-system-packages --no-cache tiktoken
    log_success "tiktoken 安裝完成"
}

# ==============================================================================
# 驗證安裝
# ==============================================================================
verify_installations() {
    log_info "驗證 Python 工具安裝..."
    
    local tools=(
        "python3:Python"
        "pip3:pip"
        "uv:uv"
        "markitdown:markitdown"
        "pdf2zh:pdf2zh"
        "babeldoc:babeldoc"
    )
    
    # MinerU 僅在 AMD64
    if [ "${ARCH}" != "aarch64" ]; then
        tools+=("mineru:MinerU")
    fi
    
    echo ""
    echo "工具驗證結果:"
    for tool_pair in "${tools[@]}"; do
        local cmd="${tool_pair%%:*}"
        local name="${tool_pair#*:}"
        
        if command -v "${cmd}" >/dev/null 2>&1; then
            echo "  ✅ ${name}: $(which "${cmd}")"
        else
            echo "  ⚠️ ${name}: 未在 PATH 中找到"
        fi
    done
    
    log_success "驗證完成"
}

# ==============================================================================
# 主程式
# ==============================================================================
main() {
    log_info "=========================================="
    log_info "開始安裝 Python 工具 (${ARCH})"
    log_info "=========================================="
    
    install_python_base
    install_uv
    install_huggingface_hub
    install_endesive
    install_markitdown
    install_pdf2zh
    install_babeldoc
    install_mineru
    install_tiktoken
    verify_installations
    
    log_success "=========================================="
    log_success "所有 Python 工具安裝完成！"
    log_success "=========================================="
}

# 執行
main "$@"
