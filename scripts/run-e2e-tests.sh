#!/bin/bash
# =============================================================================
# E2E 測試運行腳本
# E2E Test Runner Script
# =============================================================================
#
# 使用方式:
#   ./scripts/run-e2e-tests.sh [選項]
#
# 選項:
#   --all           運行所有 E2E 測試
#   --quick         只運行快速測試（跳過翻譯）
#   --matrix        只運行格式矩陣測試
#   --translation   只運行翻譯測試
#   --comprehensive 運行全面測試
#   --report        生成 HTML 報告
#
# =============================================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 腳本目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 輸出目錄
OUTPUT_DIR="$PROJECT_ROOT/tests/e2e/output"

# 確保輸出目錄存在
mkdir -p "$OUTPUT_DIR"

# 打印標題
print_header() {
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

# 打印成功訊息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 打印警告訊息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 打印錯誤訊息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 檢查依賴
check_dependencies() {
    print_header "檢查測試依賴 Checking Dependencies"
    
    local missing=0
    
    # 檢查 bun
    if command -v bun &> /dev/null; then
        print_success "bun $(bun --version)"
    else
        print_error "bun not found"
        missing=$((missing + 1))
    fi
    
    # 檢查常用轉換工具
    local tools=("inkscape" "pandoc" "ffmpeg" "magick" "soffice")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            print_success "$tool found"
        else
            print_warning "$tool not found (some tests may be skipped)"
        fi
    done
    
    # 檢查翻譯工具
    local translators=("pdf2zh" "babeldoc")
    for translator in "${translators[@]}"; do
        if command -v "$translator" &> /dev/null; then
            print_success "$translator found"
        else
            print_warning "$translator not found (translation tests will be skipped)"
        fi
    done
    
    if [ $missing -gt 0 ]; then
        print_error "Missing required dependencies"
        exit 1
    fi
    
    echo ""
}

# 運行快速測試
run_quick_tests() {
    print_header "運行快速 E2E 測試 Running Quick E2E Tests"
    
    cd "$PROJECT_ROOT"
    bun test tests/e2e/converters.e2e.test.ts --timeout 120000
}

# 運行格式矩陣測試
run_matrix_tests() {
    print_header "運行格式矩陣測試 Running Format Matrix Tests"
    
    cd "$PROJECT_ROOT"
    bun test tests/e2e/format-matrix.e2e.test.ts --timeout 300000
}

# 運行翻譯測試
run_translation_tests() {
    print_header "運行翻譯測試 Running Translation Tests"
    
    # 檢查 API 金鑰
    if [ -z "$OPENAI_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ] && [ -z "$DEEPL_API_KEY" ]; then
        print_warning "No translation API keys found. Some tests may fail."
        print_warning "Set OPENAI_API_KEY, GOOGLE_API_KEY, or DEEPL_API_KEY"
    fi
    
    cd "$PROJECT_ROOT"
    bun test tests/e2e/translation.e2e.test.ts --timeout 600000
}

# 運行全面測試
run_comprehensive_tests() {
    print_header "運行全面 E2E 測試 Running Comprehensive E2E Tests"
    
    cd "$PROJECT_ROOT"
    bun test tests/e2e/comprehensive.e2e.test.ts --timeout 600000
}

# 運行所有測試
run_all_tests() {
    print_header "運行所有 E2E 測試 Running All E2E Tests"
    
    cd "$PROJECT_ROOT"
    bun test tests/e2e/ --timeout 600000
}

# 生成 HTML 報告
generate_report() {
    print_header "生成測試報告 Generating Test Report"
    
    local report_file="$OUTPUT_DIR/test-report.html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E 測試報告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #4285f4; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
        .stat { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat .number { font-size: 36px; font-weight: bold; color: #4285f4; }
        .stat .label { color: #666; margin-top: 5px; }
        .stat.passed .number { color: #34a853; }
        .stat.failed .number { color: #ea4335; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; }
        .success { color: #34a853; }
        .failure { color: #ea4335; }
        .skipped { color: #fbbc04; }
        .footer { margin-top: 40px; color: #999; font-size: 14px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 E2E 測試報告</h1>
        <p>生成時間: <span id="timestamp"></span></p>
        
        <div class="summary">
            <div class="stat">
                <div class="number" id="total">-</div>
                <div class="label">總測試數</div>
            </div>
            <div class="stat passed">
                <div class="number" id="passed">-</div>
                <div class="label">通過</div>
            </div>
            <div class="stat failed">
                <div class="number" id="failed">-</div>
                <div class="label">失敗</div>
            </div>
            <div class="stat">
                <div class="number" id="skipped">-</div>
                <div class="label">跳過</div>
            </div>
        </div>
        
        <h2>📊 格式轉換矩陣</h2>
        <div id="matrix-content">載入中...</div>
        
        <h2>🌍 翻譯測試結果</h2>
        <div id="translation-content">載入中...</div>
        
        <div class="footer">
            ConvertX-CN E2E Test Report
        </div>
    </div>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString('zh-TW');
        
        // 嘗試載入測試報告 JSON
        async function loadReports() {
            try {
                // 載入格式矩陣報告
                const matrixResp = await fetch('format-matrix/matrix-report.json');
                if (matrixResp.ok) {
                    const matrix = await matrixResp.json();
                    document.getElementById('total').textContent = matrix.totalCombinations;
                    document.getElementById('passed').textContent = matrix.passedTests;
                    document.getElementById('failed').textContent = matrix.failedTests;
                    document.getElementById('skipped').textContent = matrix.skippedTests;
                    
                    let html = '<table><tr><th>轉換器</th><th>輸入格式</th><th>輸出格式</th><th>組合數</th></tr>';
                    for (const conv of matrix.converters) {
                        html += `<tr><td>${conv.name}</td><td>${conv.from.length}</td><td>${conv.to.length}</td><td>${conv.combinations.length}</td></tr>`;
                    }
                    html += '</table>';
                    document.getElementById('matrix-content').innerHTML = html;
                }
            } catch (e) {
                document.getElementById('matrix-content').innerHTML = '<p>無法載入報告</p>';
            }
            
            try {
                // 載入翻譯報告
                const transResp = await fetch('translation/translation-report.json');
                if (transResp.ok) {
                    const trans = await transResp.json();
                    let html = '<table><tr><th>翻譯器</th><th>來源</th><th>目標</th><th>狀態</th><th>時間</th></tr>';
                    for (const result of trans.stats.results) {
                        const status = result.success ? '<span class="success">✓</span>' : '<span class="failure">✗</span>';
                        html += `<tr><td>${result.translator}</td><td>${result.sourceLang}</td><td>${result.targetLang}</td><td>${status}</td><td>${(result.duration/1000).toFixed(1)}s</td></tr>`;
                    }
                    html += '</table>';
                    document.getElementById('translation-content').innerHTML = html;
                }
            } catch (e) {
                document.getElementById('translation-content').innerHTML = '<p>無法載入報告</p>';
            }
        }
        
        loadReports();
    </script>
</body>
</html>
EOF
    
    print_success "報告已生成: $report_file"
}

# 主函數
main() {
    print_header "ConvertX-CN E2E 測試套件"
    
    # 解析參數
    case "${1:-}" in
        --all)
            check_dependencies
            run_all_tests
            generate_report
            ;;
        --quick)
            check_dependencies
            run_quick_tests
            ;;
        --matrix)
            check_dependencies
            run_matrix_tests
            generate_report
            ;;
        --translation)
            check_dependencies
            run_translation_tests
            generate_report
            ;;
        --comprehensive)
            check_dependencies
            run_comprehensive_tests
            generate_report
            ;;
        --report)
            generate_report
            ;;
        *)
            echo "使用方式: $0 [選項]"
            echo ""
            echo "選項:"
            echo "  --all           運行所有 E2E 測試"
            echo "  --quick         只運行快速測試（跳過翻譯）"
            echo "  --matrix        只運行格式矩陣測試"
            echo "  --translation   只運行翻譯測試"
            echo "  --comprehensive 運行全面測試"
            echo "  --report        只生成 HTML 報告"
            echo ""
            echo "範例:"
            echo "  $0 --quick      # 快速測試"
            echo "  $0 --all        # 完整測試"
            exit 0
            ;;
    esac
    
    print_header "測試完成 Tests Complete"
}

main "$@"
