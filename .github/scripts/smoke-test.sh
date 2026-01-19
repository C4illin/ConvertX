#!/bin/bash
# ==============================================================================
# ConvertX Smoke Test Script
# 用於驗證 Docker image 的基本功能
# ==============================================================================

set -e

CONTAINER_NAME="${CONTAINER_NAME:-convertx-test}"
TEST_TIMEOUT="${TEST_TIMEOUT:-60}"

echo "=================================================="
echo "🧪 ConvertX Smoke Test"
echo "=================================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠️ WARN${NC}: $1"
}

# ==============================================================================
# Test 1: Container 啟動測試
# ==============================================================================
test_container_startup() {
    echo ""
    echo "📦 Test 1: Container Startup"
    echo "----------------------------"
    
    echo "Waiting for container to be healthy..."
    
    for i in $(seq 1 $TEST_TIMEOUT); do
        if docker exec $CONTAINER_NAME curl -sf http://localhost:3000/healthcheck > /dev/null 2>&1; then
            pass "Container started in ${i}s"
            return 0
        fi
        sleep 1
    done
    
    fail "Container failed to start within ${TEST_TIMEOUT}s"
}

# ==============================================================================
# Test 2: 關鍵工具存在性檢查
# ==============================================================================
test_critical_tools() {
    echo ""
    echo "🔧 Test 2: Critical Tools Availability"
    echo "---------------------------------------"
    
    local failed=0
    
    # LibreOffice (必要)
    echo -n "  libreoffice: "
    if docker exec $CONTAINER_NAME libreoffice --version > /dev/null 2>&1; then
        VERSION=$(docker exec $CONTAINER_NAME libreoffice --version 2>/dev/null | head -1)
        echo -e "${GREEN}OK${NC} ($VERSION)"
    else
        echo -e "${RED}MISSING${NC}"
        failed=1
    fi
    
    # Pandoc (必要)
    echo -n "  pandoc: "
    if docker exec $CONTAINER_NAME pandoc --version > /dev/null 2>&1; then
        VERSION=$(docker exec $CONTAINER_NAME pandoc --version 2>/dev/null | head -1)
        echo -e "${GREEN}OK${NC} ($VERSION)"
    else
        echo -e "${RED}MISSING${NC}"
        failed=1
    fi
    
    # FFmpeg (必要)
    echo -n "  ffmpeg: "
    if docker exec $CONTAINER_NAME ffmpeg -version > /dev/null 2>&1; then
        VERSION=$(docker exec $CONTAINER_NAME ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')
        echo -e "${GREEN}OK${NC} (v$VERSION)"
    else
        echo -e "${RED}MISSING${NC}"
        failed=1
    fi
    
    # Tesseract (必要)
    echo -n "  tesseract: "
    if docker exec $CONTAINER_NAME tesseract --version > /dev/null 2>&1; then
        VERSION=$(docker exec $CONTAINER_NAME tesseract --version 2>/dev/null | head -1)
        echo -e "${GREEN}OK${NC} ($VERSION)"
    else
        echo -e "${RED}MISSING${NC}"
        failed=1
    fi
    
    echo ""
    echo "  Additional tools (optional):"
    
    # ImageMagick
    echo -n "  imagemagick: "
    if docker exec $CONTAINER_NAME magick -version > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Not found${NC}"
    fi
    
    # Inkscape
    echo -n "  inkscape: "
    if docker exec $CONTAINER_NAME inkscape --version > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Not found${NC}"
    fi
    
    # GraphicsMagick
    echo -n "  graphicsmagick: "
    if docker exec $CONTAINER_NAME gm version > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Not found${NC}"
    fi
    
    # Calibre
    echo -n "  calibre: "
    if docker exec $CONTAINER_NAME ebook-convert --version > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${YELLOW}Not found${NC}"
    fi
    
    echo ""
    
    if [ $failed -eq 1 ]; then
        fail "Critical tools check failed"
    else
        pass "All critical tools available"
    fi
}

# ==============================================================================
# Test 3: 最小轉換測試
# ==============================================================================
test_minimal_conversion() {
    echo ""
    echo "📄 Test 3: Minimal Conversion"
    echo "-----------------------------"
    
    # 在 container 內建立測試檔案並轉換
    echo "  Creating test file..."
    docker exec $CONTAINER_NAME sh -c "echo 'ConvertX Smoke Test - $(date)' > /tmp/test.txt"
    
    echo "  Converting txt → pdf using LibreOffice..."
    if docker exec $CONTAINER_NAME sh -c "cd /tmp && libreoffice --headless --convert-to pdf test.txt" > /dev/null 2>&1; then
        # 檢查輸出檔案
        if docker exec $CONTAINER_NAME test -f /tmp/test.pdf; then
            SIZE=$(docker exec $CONTAINER_NAME stat -c%s /tmp/test.pdf 2>/dev/null || echo "unknown")
            pass "Conversion successful (output: ${SIZE} bytes)"
        else
            fail "Conversion failed - output file not found"
        fi
    else
        fail "LibreOffice conversion command failed"
    fi
    
    # 清理
    docker exec $CONTAINER_NAME rm -f /tmp/test.txt /tmp/test.pdf 2>/dev/null || true
}

# ==============================================================================
# Test 4: API 端點檢查
# ==============================================================================
test_api_endpoints() {
    echo ""
    echo "🌐 Test 4: API Endpoints"
    echo "------------------------"
    
    local failed=0
    
    # Healthcheck
    echo -n "  GET /healthcheck: "
    if docker exec $CONTAINER_NAME curl -sf http://localhost:3000/healthcheck > /dev/null 2>&1; then
        echo -e "${GREEN}200 OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        failed=1
    fi
    
    # Root
    echo -n "  GET /: "
    if docker exec $CONTAINER_NAME curl -sf http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}200 OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        failed=1
    fi
    
    echo ""
    
    if [ $failed -eq 1 ]; then
        fail "API endpoints check failed"
    else
        pass "All API endpoints responding"
    fi
}

# ==============================================================================
# Main
# ==============================================================================
main() {
    local start_time=$(date +%s)
    
    test_container_startup
    test_critical_tools
    test_minimal_conversion
    test_api_endpoints
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "=================================================="
    echo -e "🎉 ${GREEN}All smoke tests passed!${NC}"
    echo "   Total time: ${duration}s"
    echo "=================================================="
}

main "$@"
