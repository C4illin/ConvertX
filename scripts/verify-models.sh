#!/bin/bash
# ==============================================================================
# ConvertX-CN 模型驗證腳本 v2.0
# ==============================================================================
#
# 用途：驗證 Docker Image 中的預下載模型是否完整
# 執行：docker exec <container> /app/scripts/verify-models.sh
#
# ==============================================================================

set -e

echo "========================================"
echo "🔍 ConvertX-CN 模型驗證 v2.0"
echo "========================================"
echo ""

# 計數器
PASS=0
FAIL=0
WARN=0
ARCH=$(uname -m)

# 檢查函數
check_file() {
    local path="$1"
    local name="$2"
    if [ -f "$path" ]; then
        local size=$(ls -lh "$path" | awk '{print $5}')
        echo "✅ $name: $path ($size)"
        ((PASS++))
    else
        echo "❌ $name: $path 不存在"
        ((FAIL++))
    fi
}

check_dir() {
    local path="$1"
    local name="$2"
    local required="${3:-false}"
    if [ -d "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
        echo "✅ $name: $path ($size)"
        ((PASS++))
    else
        if [ "$required" = "true" ]; then
            echo "❌ $name: $path 不存在（必要）"
            ((FAIL++))
        else
            echo "⚠️ $name: $path 不存在（可選）"
            ((WARN++))
        fi
    fi
}

# ==============================================================================
# 1. PDFMathTranslate / BabelDOC ONNX 模型
# ==============================================================================
echo "📦 PDFMathTranslate / BabelDOC 模型"
echo "----------------------------------------"
check_file "/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx" "DocLayout-YOLO ONNX"
echo ""

# ==============================================================================
# 2. PDFMathTranslate 字型
# ==============================================================================
echo "🔤 PDFMathTranslate 字型"
echo "----------------------------------------"
check_file "/usr/share/fonts/truetype/custom/GoNotoKurrent-Regular.ttf" "Noto 通用字型"
check_file "/usr/share/fonts/truetype/custom/SourceHanSerifCN-Regular.ttf" "思源宋體（簡體）"
check_file "/usr/share/fonts/truetype/custom/SourceHanSerifTW-Regular.ttf" "思源宋體（繁體）"
check_file "/usr/share/fonts/truetype/custom/SourceHanSerifJP-Regular.ttf" "思源宋體（日文）"
check_file "/usr/share/fonts/truetype/custom/SourceHanSerifKR-Regular.ttf" "思源宋體（韓文）"
echo ""

# ==============================================================================
# 3. MinerU 模型（新路徑：/opt/mineru）
# ==============================================================================
echo "📦 MinerU 模型"
echo "----------------------------------------"
if [ "$ARCH" = "aarch64" ]; then
    echo "⚠️ ARM64 架構：MinerU 不支援，跳過驗證"
    ((WARN++))
else
    check_dir "/opt/mineru/models/PDF-Extract-Kit-1.0" "PDF-Extract-Kit-1.0 Pipeline" "true"
    check_file "/root/mineru.json" "MinerU 配置檔"
fi
echo ""

# ==============================================================================
# 4. BabelDOC 快取
# ==============================================================================
echo "📦 BabelDOC 快取"
echo "----------------------------------------"
check_dir "/root/.cache/babeldoc" "BabelDOC 快取"
check_dir "/root/.cache/babeldoc/models" "BabelDOC Models"
check_dir "/root/.cache/babeldoc/fonts" "BabelDOC Fonts"
echo ""

# ==============================================================================
# 5. 環境變數檢查（離線模式）
# ==============================================================================
echo "🔧 環境變數（離線模式）"
echo "----------------------------------------"
echo "HF_HUB_OFFLINE: ${HF_HUB_OFFLINE:-未設定}"
echo "TRANSFORMERS_OFFLINE: ${TRANSFORMERS_OFFLINE:-未設定}"
echo "HF_HOME: ${HF_HOME:-未設定}"
echo "MINERU_MODEL_SOURCE: ${MINERU_MODEL_SOURCE:-未設定}"
echo "BABELDOC_OFFLINE: ${BABELDOC_OFFLINE:-未設定}"
echo "PIP_NO_INDEX: ${PIP_NO_INDEX:-未設定}"
echo ""

# ==============================================================================
# 6. MinerU 設定檔
# ==============================================================================
echo "📝 MinerU 設定檔"
echo "----------------------------------------"
if [ "$ARCH" = "aarch64" ]; then
    echo "⚠️ ARM64 架構：跳過 MinerU 配置驗證"
    ((WARN++))
elif [ -f "/root/mineru.json" ]; then
    echo "✅ /root/mineru.json 存在"
    cat /root/mineru.json
    ((PASS++))
else
    echo "❌ /root/mineru.json 不存在"
    ((FAIL++))
fi
echo ""

# ==============================================================================
# 7. 工具可執行性驗證
# ==============================================================================
echo "🔧 工具可執行性"
echo "----------------------------------------"
for cmd in mineru babeldoc pdf2zh markitdown convert ffmpeg pandoc; do
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "✅ $cmd: $(which $cmd)"
        ((PASS++))
    else
        if [ "$cmd" = "mineru" ] && [ "$ARCH" = "aarch64" ]; then
            echo "⚠️ $cmd: ARM64 不支援"
            ((WARN++))
        else
            echo "⚠️ $cmd: 未找到"
            ((WARN++))
        fi
    fi
done
echo ""

# ==============================================================================
# 總結
# ==============================================================================
echo "========================================"
echo "📊 驗證結果"
echo "========================================"
echo "✅ 通過: $PASS"
echo "⚠️ 警告: $WARN"
echo "❌ 失敗: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
    echo "❌ 驗證失敗！部分必要模型缺失。"
    echo "   建議重新 build Docker Image。"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo "⚠️ 驗證完成，但有警告。"
    echo "   部分可選功能可能需要確認。"
    exit 0
else
    echo "✅ 所有模型驗證通過！"
    echo "   系統可在離線環境正常運作。"
    exit 0
fi
