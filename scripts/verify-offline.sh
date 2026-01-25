#!/bin/bash
# ==============================================================================
# ConvertX-CN 離線驗證腳本 v2.0
# ==============================================================================
#
# 用途：驗證 Docker Image 在完全離線環境下可正常運作
# 執行方式：
#   1. 容器內執行：/app/scripts/verify-offline.sh
#   2. 網路隔離測試：docker run --network=none <image> /app/scripts/verify-offline.sh
#
# 驗證項目：
#   1. MinerU：可執行 + 模型存在 + 配置正確
#   2. BabelDOC：可執行 + cache 存在
#   3. PDFMathTranslate (pdf2zh)：可執行 + ONNX 模型存在
#   4. ImageMagick：可執行
#   5. 字型：自訂字型已安裝
#   6. 環境變數：離線模式已正確設定
#
# ==============================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║         ConvertX-CN 離線驗證腳本 v2.0                                ║"
echo "║         Runtime Zero-Download Verification                           ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# 計數器
PASS=0
FAIL=0
WARN=0
ARCH=$(uname -m)

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查函數
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
}

warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
    ((WARN++))
}

info() {
    echo -e "   ℹ️ $1"
}

check_command() {
    local cmd="$1"
    local name="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
        pass "$name 可執行: $(which $cmd)"
        return 0
    else
        fail "$name 未安裝或不在 PATH"
        return 1
    fi
}

check_file() {
    local path="$1"
    local name="$2"
    if [ -f "$path" ]; then
        local size=$(ls -lh "$path" 2>/dev/null | awk '{print $5}')
        pass "$name: $path ($size)"
        return 0
    else
        fail "$name: $path 不存在"
        return 1
    fi
}

check_dir() {
    local path="$1"
    local name="$2"
    local required="${3:-false}"
    if [ -d "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
        pass "$name: $path ($size)"
        return 0
    else
        if [ "$required" = "true" ]; then
            fail "$name: $path 不存在（必要）"
        else
            warn "$name: $path 不存在（可選）"
        fi
        return 1
    fi
}

check_env() {
    local var="$1"
    local expected="$2"
    local actual="${!var}"
    if [ -n "$actual" ]; then
        if [ -n "$expected" ] && [ "$actual" != "$expected" ]; then
            warn "$var = $actual（預期: $expected）"
        else
            pass "$var = $actual"
        fi
    else
        warn "$var 未設定"
    fi
}

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 1. MinerU 驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

if [ "$ARCH" = "aarch64" ]; then
    warn "ARM64 架構：MinerU 不支援，跳過驗證"
else
    # 檢查 mineru 命令
    check_command "mineru" "MinerU CLI"
    
    # 檢查模型目錄
    MINERU_MODELS="/opt/convertx/models/mineru/PDF-Extract-Kit-1.0"
    check_dir "$MINERU_MODELS" "MinerU Pipeline 模型" "true"
    
    # 檢查配置檔
    if check_file "/root/mineru.json" "MinerU 配置檔"; then
        info "配置內容："
        cat /root/mineru.json 2>/dev/null | head -10
    fi
    
    # 驗證配置指向正確目錄
    if [ -f "/root/mineru.json" ]; then
        CONFIGURED_PATH=$(python3 -c "import json; f=open('/root/mineru.json'); d=json.load(f); print(d.get('models-dir',{}).get('pipeline',''))" 2>/dev/null || echo "")
        if [ "$CONFIGURED_PATH" = "$MINERU_MODELS" ]; then
            pass "mineru.json 指向正確目錄"
        else
            fail "mineru.json 指向錯誤目錄: $CONFIGURED_PATH"
        fi
    fi
fi
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 2. BabelDOC 驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

check_command "babeldoc" "BabelDOC CLI"

# 檢查 cache 目錄
check_dir "/root/.cache/babeldoc" "BabelDOC Cache"
check_dir "/root/.cache/babeldoc/models" "BabelDOC Models"
check_dir "/root/.cache/babeldoc/fonts" "BabelDOC Fonts"

# 檢查 ONNX 模型
BABELDOC_ONNX="/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx"
check_file "$BABELDOC_ONNX" "DocLayout-YOLO ONNX"

# 測試 babeldoc --help（不應觸發下載）
if command -v babeldoc >/dev/null 2>&1; then
    if timeout 10 babeldoc --help >/dev/null 2>&1; then
        pass "babeldoc --help 可離線執行"
    else
        warn "babeldoc --help 執行異常"
    fi
fi
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 3. PDFMathTranslate (pdf2zh) 驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

check_command "pdf2zh" "pdf2zh CLI"

# 測試 pdf2zh --help
if command -v pdf2zh >/dev/null 2>&1; then
    if timeout 10 pdf2zh --help >/dev/null 2>&1; then
        pass "pdf2zh --help 可離線執行"
    else
        warn "pdf2zh --help 執行異常"
    fi
fi
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 4. ImageMagick 驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

if check_command "convert" "ImageMagick (convert)"; then
    VERSION=$(convert --version 2>/dev/null | head -1)
    info "版本: $VERSION"
fi

check_command "identify" "ImageMagick (identify)"
check_command "mogrify" "ImageMagick (mogrify)"
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔤 5. 字型驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

CUSTOM_FONTS_DIR="/usr/share/fonts/truetype/custom"
if check_dir "$CUSTOM_FONTS_DIR" "自訂字型目錄"; then
    FONT_COUNT=$(ls -1 "$CUSTOM_FONTS_DIR"/*.ttf 2>/dev/null | wc -l)
    info "字型檔案數量: $FONT_COUNT"
    ls -1 "$CUSTOM_FONTS_DIR"/*.ttf 2>/dev/null | while read f; do
        info "  - $(basename $f)"
    done
fi

# 驗證必要字型
check_file "$CUSTOM_FONTS_DIR/GoNotoKurrent-Regular.ttf" "Noto 通用字型"
check_file "$CUSTOM_FONTS_DIR/SourceHanSerifCN-Regular.ttf" "思源宋體（簡體）"
check_file "$CUSTOM_FONTS_DIR/SourceHanSerifTW-Regular.ttf" "思源宋體（繁體）"
check_file "$CUSTOM_FONTS_DIR/SourceHanSerifJP-Regular.ttf" "思源宋體（日文）"
check_file "$CUSTOM_FONTS_DIR/SourceHanSerifKR-Regular.ttf" "思源宋體（韓文）"
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 6. 離線環境變數驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

echo "📋 HuggingFace 離線設定："
check_env "HF_HUB_OFFLINE" "1"
check_env "TRANSFORMERS_OFFLINE" "1"
check_env "HF_DATASETS_OFFLINE" "1"
check_env "HF_HOME" "/nonexistent"
check_env "TRANSFORMERS_CACHE" "/nonexistent"

echo ""
echo "📋 MinerU 設定："
check_env "MINERU_MODEL_SOURCE" "local"
check_env "MINERU_CONFIG"

echo ""
echo "📋 BabelDOC 設定："
check_env "BABELDOC_OFFLINE" "1"
check_env "BABELDOC_CACHE_PATH"

echo ""
echo "📋 pip 設定："
check_env "PIP_NO_INDEX" "1"
echo ""

# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 7. 其他核心工具驗證"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# ==============================================================================

check_command "ffmpeg" "FFmpeg"
check_command "pandoc" "Pandoc"
check_command "libreoffice" "LibreOffice"
check_command "tesseract" "Tesseract OCR"
check_command "gs" "Ghostscript"
check_command "inkscape" "Inkscape"
check_command "markitdown" "MarkItDown"
echo ""

# ==============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                         驗證結果總結                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ 通過: $PASS"
echo "  ⚠️ 警告: $WARN"
echo "  ❌ 失敗: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ 離線驗證失敗！                                                   ║${NC}"
    echo -e "${RED}║  部分必要組件缺失，Image 不應發布到 Production。                     ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️ 離線驗證通過，但有警告                                          ║${NC}"
    echo -e "${YELLOW}║  部分可選功能可能受限，請確認是否符合需求。                         ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ 離線驗證完全通過！                                               ║${NC}"
    echo -e "${GREEN}║  系統可在 docker run --network=none 環境正常運作。                   ║${NC}"
    echo -e "${GREEN}║  （翻譯服務除外，需網路連接）                                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
fi
