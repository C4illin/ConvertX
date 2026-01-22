#!/bin/bash
# ==============================================================================
# ConvertX-CN 模型驗證腳本
# ==============================================================================
#
# 用途：驗證 Docker Image 中的預下載模型是否完整
# 執行：docker exec <container> /app/scripts/verify-models.sh
#
# ==============================================================================

set -e

echo "========================================"
echo "🔍 ConvertX-CN 模型驗證"
echo "========================================"
echo ""

# 計數器
PASS=0
FAIL=0
WARN=0

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
    if [ -d "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
        echo "✅ $name: $path ($size)"
        ((PASS++))
    else
        echo "⚠️ $name: $path 不存在"
        ((WARN++))
    fi
}

# ==============================================================================
# 1. PDFMathTranslate 模型
# ==============================================================================
echo "📦 PDFMathTranslate 模型"
echo "----------------------------------------"
check_file "/models/pdfmathtranslate/model.onnx" "DocLayout-YOLO ONNX"
echo ""

# ==============================================================================
# 2. PDFMathTranslate 字型
# ==============================================================================
echo "🔤 PDFMathTranslate 字型"
echo "----------------------------------------"
check_file "/app/GoNotoKurrent-Regular.ttf" "Noto 通用字型"
check_file "/app/SourceHanSerifCN-Regular.ttf" "思源宋體（簡體）"
check_file "/app/SourceHanSerifTW-Regular.ttf" "思源宋體（繁體）"
check_file "/app/SourceHanSerifJP-Regular.ttf" "思源宋體（日文）"
check_file "/app/SourceHanSerifKR-Regular.ttf" "思源宋體（韓文）"
echo ""

# ==============================================================================
# 3. MinerU 模型
# ==============================================================================
echo "📦 MinerU 模型"
echo "----------------------------------------"
check_dir "/root/.cache/huggingface/hub/PDF-Extract-Kit-1.0" "PDF-Extract-Kit-1.0 Pipeline"
check_dir "/root/.cache/huggingface/hub/MinerU-VLM" "MinerU VLM（可選）"
echo ""

# ==============================================================================
# 4. BabelDOC 快取
# ==============================================================================
echo "📦 BabelDOC 快取"
echo "----------------------------------------"
if [ -d "/root/.cache/babeldoc" ]; then
    check_dir "/root/.cache/babeldoc" "BabelDOC 快取"
elif [ -d "/root/.local/share/babeldoc" ]; then
    check_dir "/root/.local/share/babeldoc" "BabelDOC 資料"
else
    echo "⚠️ BabelDOC 快取目錄未找到（可能使用其他路徑）"
    ((WARN++))
fi
echo ""

# ==============================================================================
# 5. 環境變數檢查
# ==============================================================================
echo "🔧 環境變數"
echo "----------------------------------------"
echo "PDFMATHTRANSLATE_MODELS_PATH: ${PDFMATHTRANSLATE_MODELS_PATH:-未設定}"
echo "NOTO_FONT_PATH: ${NOTO_FONT_PATH:-未設定}"
echo "MINERU_MODEL_SOURCE: ${MINERU_MODEL_SOURCE:-未設定}"
echo "HF_HUB_OFFLINE: ${HF_HUB_OFFLINE:-未設定}"
echo ""

# ==============================================================================
# 6. MinerU 設定檔
# ==============================================================================
echo "📝 MinerU 設定檔"
echo "----------------------------------------"
if [ -f "/root/mineru.json" ]; then
    echo "✅ /root/mineru.json 存在"
    cat /root/mineru.json
    ((PASS++))
else
    echo "⚠️ /root/mineru.json 不存在"
    ((WARN++))
fi
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
    echo "   部分可選模型可能需要 runtime 下載。"
    exit 0
else
    echo "✅ 所有模型驗證通過！"
    echo "   系統可在離線環境正常運作。"
    exit 0
fi
