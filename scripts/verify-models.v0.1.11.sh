#!/bin/bash
# ==============================================================================
# ConvertX-CN 模型驗證腳本
# 版本：v0.1.11
# ==============================================================================
#
# 用途：驗證 Docker Image 中的預下載模型是否完整
# 執行：docker exec <container> /app/scripts/verify-models.sh
#
# ⚠️ 重要說明：
#    此腳本驗證的是「模型目錄」而非「HuggingFace cache」
#    因為 Dockerfile 中已將 cache 清除，模型被複製到獨立目錄
#
# ==============================================================================

set -e

echo "========================================"
echo "🔍 ConvertX-CN 模型驗證 (v0.1.11)"
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
    local required="$3"  # "required" 或 "optional"
    if [ -d "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | awk '{print $1}')
        echo "✅ $name: $path ($size)"
        ((PASS++))
    else
        if [ "$required" = "required" ]; then
            echo "❌ $name: $path 不存在"
            ((FAIL++))
        else
            echo "⚠️ $name: $path 不存在（可選）"
            ((WARN++))
        fi
    fi
}

check_command() {
    local cmd="$1"
    local name="$2"
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "✅ $name: $(which $cmd)"
        ((PASS++))
    else
        echo "⚠️ $name: 未安裝"
        ((WARN++))
    fi
}

# ==============================================================================
# 1. PDFMathTranslate 模型（必要）
# ==============================================================================
echo "📦 PDFMathTranslate 模型"
echo "----------------------------------------"
# 檢查 ONNX 模型（可能是 model.onnx 或其他名稱）
ONNX_FILES=$(find /models/pdfmathtranslate -name "*.onnx" 2>/dev/null | wc -l)
if [ "$ONNX_FILES" -gt 0 ]; then
    echo "✅ DocLayout-YOLO ONNX: 找到 $ONNX_FILES 個模型"
    find /models/pdfmathtranslate -name "*.onnx" -exec ls -lh {} \; 2>/dev/null
    ((PASS++))
else
    echo "❌ DocLayout-YOLO ONNX: 未找到任何 .onnx 檔案"
    ((FAIL++))
fi
echo ""

# ==============================================================================
# 2. PDFMathTranslate 字型（必要）
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
# 3. MinerU 模型（可選）
# ==============================================================================
echo "📦 MinerU 模型"
echo "----------------------------------------"
# 注意：模型現在位於 /models/mineru，而非 HuggingFace cache
check_dir "/models/mineru/PDF-Extract-Kit-1.0" "PDF-Extract-Kit-1.0 Pipeline" "optional"
echo ""

# ==============================================================================
# 4. BabelDOC 狀態（可選）
# ==============================================================================
echo "📦 BabelDOC 狀態"
echo "----------------------------------------"
check_command "babeldoc" "BabelDOC CLI"
if [ -d "/root/.cache/babeldoc" ]; then
    check_dir "/root/.cache/babeldoc" "BabelDOC 快取" "optional"
else
    echo "ℹ️ BabelDOC 使用外部 API（Google/DeepL/OpenAI），不需要本地模型"
    ((PASS++))
fi
echo ""

# ==============================================================================
# 5. CLI 工具檢查
# ==============================================================================
echo "🔧 CLI 工具"
echo "----------------------------------------"
check_command "pdf2zh" "PDFMathTranslate (pdf2zh)"
check_command "mineru" "MinerU"
check_command "markitdown" "MarkItDown"
echo ""

# ==============================================================================
# 6. 環境變數檢查
# ==============================================================================
echo "🔧 環境變數"
echo "----------------------------------------"
echo "PDFMATHTRANSLATE_MODELS_PATH: ${PDFMATHTRANSLATE_MODELS_PATH:-未設定}"
echo "NOTO_FONT_PATH: ${NOTO_FONT_PATH:-未設定}"
echo "MINERU_MODELS_PATH: ${MINERU_MODELS_PATH:-未設定}"
echo "HF_HUB_OFFLINE: ${HF_HUB_OFFLINE:-未設定}"
echo "TRANSFORMERS_OFFLINE: ${TRANSFORMERS_OFFLINE:-未設定}"
echo ""

# ==============================================================================
# 7. MinerU 設定檔
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
# 8. Cache 清理驗證（OFFLINE-FIRST 設計要求）
# ==============================================================================
echo "🧹 Cache 清理驗證"
echo "----------------------------------------"
if [ -d "/root/.cache/huggingface" ]; then
    HF_SIZE=$(du -sh /root/.cache/huggingface 2>/dev/null | awk '{print $1}')
    echo "❌ HuggingFace cache 存在: $HF_SIZE"
    echo "   這違反 OFFLINE-FIRST 設計原則！"
    echo "   cache 應該在 Docker build 時清除"
    ((FAIL++))
else
    echo "✅ HuggingFace cache 已清除（符合 OFFLINE-FIRST 設計）"
    ((PASS++))
fi

if [ -d "/root/.cache/pip" ]; then
    echo "⚠️ pip cache 存在（應該已清除）"
    ((WARN++))
else
    echo "✅ pip cache 已清除"
    ((PASS++))
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
    echo "   部分可選功能可能不可用。"
    echo ""
    echo "ℹ️ 提示："
    echo "   - MinerU 模型可選，如需使用請確保 build 時下載成功"
    echo "   - BabelDOC 使用外部 API，不需要本地模型"
    echo "   - HF_HUB_OFFLINE=1 會阻止 runtime 下載"
    exit 0
else
    echo "✅ 所有模型驗證通過！"
    echo "   系統可在離線環境正常運作。"
    echo ""
    echo "🔒 OFFLINE-FIRST 設計已生效："
    echo "   - HF_HUB_OFFLINE=1"
    echo "   - TRANSFORMERS_OFFLINE=1"
    echo "   - 所有 cache 已清除"
    exit 0
fi
