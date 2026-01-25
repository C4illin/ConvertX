#!/usr/bin/env bash
# ==============================================================================
# ConvertX-CN 系統工具安裝腳本
# ==============================================================================
# 用途：安裝所有系統級轉換工具和依賴
# 執行環境：Docker build stage (system-tools)
# ==============================================================================

set -euo pipefail

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}📦 [INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠️ [WARN]${NC} $1"; }
log_error() { echo -e "${RED}❌ [ERROR]${NC} $1"; }

# 架構檢測
ARCH=$(uname -m)
log_info "檢測架構: ${ARCH}"

# ==============================================================================
# APT 配置
# ==============================================================================
configure_apt() {
    log_info "配置 APT 重試機制..."
    cat > /etc/apt/apt.conf.d/80-retries <<EOF
Acquire::Retries "5";
Acquire::http::Timeout "120";
Acquire::https::Timeout "120";
Acquire::ftp::Timeout "120";
APT::Get::Assume-Yes "true";
DPkg::Lock::Timeout "120";
EOF
}

# ==============================================================================
# 基礎系統工具
# ==============================================================================
install_base_tools() {
    log_info "安裝基礎系統工具..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        locales \
        ca-certificates \
        curl \
        wget \
        unzip \
        openssl \
        git \
        xz-utils
    rm -rf /var/lib/apt/lists/*
    log_success "基礎系統工具安裝完成"
}

# ==============================================================================
# 核心轉換工具（輕量）
# ==============================================================================
install_core_converters() {
    log_info "安裝核心轉換工具..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        assimp-utils \
        dcraw \
        dvisvgm \
        ghostscript \
        graphicsmagick \
        mupdf-tools \
        poppler-utils \
        potrace \
        qpdf
    rm -rf /var/lib/apt/lists/*
    log_success "核心轉換工具安裝完成"
}

# ==============================================================================
# dasel（JSON/YAML/TOML 轉換）
# ==============================================================================
install_dasel() {
    log_info "安裝 dasel..."
    local DASEL_VERSION="2.8.1"
    local DASEL_ARCH
    
    if [ "${ARCH}" = "aarch64" ]; then
        DASEL_ARCH="linux_arm64"
    else
        DASEL_ARCH="linux_amd64"
    fi
    
    curl -sSLf --retry 3 --retry-delay 5 --retry-all-errors \
        "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_${DASEL_ARCH}" \
        -o /usr/local/bin/dasel
    chmod +x /usr/local/bin/dasel
    log_success "dasel 安裝完成: $(dasel --version)"
}

# ==============================================================================
# resvg（SVG 渲染器）
# ==============================================================================
install_resvg() {
    log_info "安裝 resvg..."
    local RESVG_VERSION="0.44.0"
    
    if [ "${ARCH}" = "aarch64" ]; then
        log_warn "resvg 無 ARM64 預編譯版本，跳過安裝"
        return 0
    fi
    
    curl -sSLf --retry 3 --retry-delay 5 --retry-all-errors \
        "https://github.com/linebender/resvg/releases/download/v${RESVG_VERSION}/resvg-linux-x86_64.tar.gz" \
        -o /tmp/resvg.tar.gz
    tar -xzf /tmp/resvg.tar.gz -C /tmp/
    mv /tmp/resvg /usr/local/bin/resvg
    chmod +x /usr/local/bin/resvg
    rm -rf /tmp/resvg.tar.gz
    log_success "resvg 安裝完成"
}

# ==============================================================================
# deark（檔案格式解碼器）
# ==============================================================================
install_deark() {
    log_info "編譯安裝 deark..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends build-essential
    
    cd /tmp
    git clone --depth 1 https://github.com/jsummers/deark.git
    cd deark
    make -j"$(nproc)"
    cp deark /usr/local/bin/deark
    chmod +x /usr/local/bin/deark
    
    # 清理
    cd /
    rm -rf /tmp/deark
    apt-get remove -y build-essential
    apt-get autoremove -y
    rm -rf /var/lib/apt/lists/*
    log_success "deark 安裝完成"
}

# ==============================================================================
# vtracer（向量圖追蹤）
# ==============================================================================
install_vtracer() {
    log_info "安裝 vtracer..."
    local VTRACER_VERSION="0.6.4"
    local VTRACER_ASSET
    
    if [ "${ARCH}" = "aarch64" ]; then
        VTRACER_ASSET="vtracer-aarch64-unknown-linux-musl.tar.gz"
    else
        VTRACER_ASSET="vtracer-x86_64-unknown-linux-musl.tar.gz"
    fi
    
    curl -L --retry 3 --retry-delay 5 --retry-all-errors \
        -o /tmp/vtracer.tar.gz \
        "https://github.com/visioncortex/vtracer/releases/download/${VTRACER_VERSION}/${VTRACER_ASSET}"
    tar -xzf /tmp/vtracer.tar.gz -C /tmp/
    mv /tmp/vtracer /usr/local/bin/vtracer
    chmod +x /usr/local/bin/vtracer
    rm -rf /tmp/vtracer.tar.gz
    log_success "vtracer 安裝完成"
}

# ==============================================================================
# FFmpeg（影音處理）
# ==============================================================================
install_ffmpeg() {
    log_info "安裝 FFmpeg..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        ffmpeg \
        libavcodec-extra \
        libva2
    rm -rf /var/lib/apt/lists/*
    log_success "FFmpeg 安裝完成: $(ffmpeg -version | head -1)"
}

# ==============================================================================
# 圖像處理工具（ImageMagick, Inkscape, vips 等）
# ==============================================================================
install_image_tools() {
    log_info "安裝圖像處理工具..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        imagemagick \
        inkscape \
        libheif-examples \
        libjxl-tools \
        libvips-tools \
        xauth \
        xvfb
    rm -rf /var/lib/apt/lists/*
    log_success "圖像處理工具安裝完成"
}

# ==============================================================================
# 文件處理工具（Calibre, Pandoc）
# ==============================================================================
install_document_tools() {
    log_info "安裝 Calibre + Pandoc..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        calibre \
        libemail-outlook-message-perl \
        pandoc
    rm -rf /var/lib/apt/lists/*
    log_success "Calibre + Pandoc 安裝完成"
}

# ==============================================================================
# LibreOffice
# ==============================================================================
install_libreoffice() {
    log_info "安裝 LibreOffice（需數分鐘）..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends libreoffice
    rm -rf /var/lib/apt/lists/*
    log_success "LibreOffice 安裝完成"
}

# ==============================================================================
# TexLive（LaTeX）
# ==============================================================================
install_texlive() {
    log_info "安裝 TexLive 基礎..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        texlive-base \
        texlive-latex-base \
        texlive-latex-recommended \
        texlive-fonts-recommended \
        texlive-xetex \
        latexmk \
        lmodern
    rm -rf /var/lib/apt/lists/*
    
    log_info "安裝 TexLive 語言包..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        texlive-lang-cjk \
        texlive-lang-german \
        texlive-lang-french \
        texlive-lang-arabic \
        texlive-lang-other
    rm -rf /var/lib/apt/lists/*
    log_success "TexLive 安裝完成"
}

# ==============================================================================
# Tesseract OCR
# ==============================================================================
install_tesseract() {
    log_info "安裝 Tesseract OCR..."
    apt-get update --fix-missing
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-chi-tra \
        tesseract-ocr-chi-sim \
        tesseract-ocr-jpn \
        tesseract-ocr-kor \
        tesseract-ocr-deu \
        tesseract-ocr-fra \
        ocrmypdf
    rm -rf /var/lib/apt/lists/*
    log_success "Tesseract OCR 安裝完成"
}

# ==============================================================================
# 主程式
# ==============================================================================
main() {
    log_info "=========================================="
    log_info "開始安裝系統工具 (${ARCH})"
    log_info "=========================================="
    
    configure_apt
    install_base_tools
    install_core_converters
    install_dasel
    install_resvg
    install_deark
    install_vtracer
    install_ffmpeg
    install_image_tools
    install_document_tools
    install_libreoffice
    install_texlive
    install_tesseract
    
    log_success "=========================================="
    log_success "所有系統工具安裝完成！"
    log_success "=========================================="
}

# 執行
main "$@"
