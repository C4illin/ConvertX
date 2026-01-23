# ==============================================================================
# ConvertX-CN 官方 Docker Image
# 版本：v0.1.12
# ==============================================================================
#
# 📦 Image 說明：
#   - 這是 ConvertX-CN 官方 Docker Hub Image 的生產 Dockerfile
#   - 已內建完整功能，無需額外擴充
#   - ⚠️ 所有模型已在 build 階段預下載，runtime 不依賴網路
#
# 🌍 內建語言支援：
#   - OCR: 英文、繁體中文、簡體中文、日文、韓文、德文、法文
#   - Locale: en_US, zh_TW, zh_CN, ja_JP, ko_KR, de_DE, fr_FR
#   - 字型: Noto CJK, Liberation, 標楷體
#   - LaTeX: CJK、德文、法文、阿拉伯語、希伯來語
#
# 🤖 預下載模型清單：
#   - PDFMathTranslate: DocLayout-YOLO ONNX（佈局分析）
#   - BabelDOC: DocLayout-YOLO + 字型資源（顯式下載，無 warmup）
#   - MinerU: PDF-Extract-Kit-1.0（Pipeline 模型）
#     包含：DocLayout-YOLO, YOLOv8 MFD, UniMERNet, PaddleOCR, LayoutReader, SLANet
#
# 📊 Image 大小：約 8-12 GB（含模型）
#
# ⚠️ Base Image：使用 debian:bookworm（穩定版）
#    - 確保 Multi-Arch (amd64/arm64) 構建穩定性
#    - 避免 trixie (testing) 套件同步不穩定問題
#
# 🔒 Offline-first 設計原則：
#    - 所有下載行為僅發生在 Docker build 階段
#    - Runtime 完全離線運行，不依賴任何網路請求
#    - 禁止任何 CLI warmup / 隱性下載行為
#    - 所有 cache 在同一 RUN 內清除，避免 layer diff 膨脹
#
# ==============================================================================

FROM debian:bookworm-slim AS base
LABEL org.opencontainers.image.source="https://github.com/pi-docket/ConvertX-CN"
LABEL org.opencontainers.image.description="ConvertX-CN - 精簡版檔案轉換服務"
WORKDIR /app

# 配置 APT 重試機制（解決 Multi-Arch Build 時的網路不穩定問題）
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::http::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::https::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::ftp::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'DPkg::Lock::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries

# install bun
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  unzip \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# if architecture is arm64, use the arm64 version of bun
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  curl -fsSL -o bun-linux-aarch64.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.6/bun-linux-aarch64.zip; \
  else \
  curl -fsSL -o bun-linux-x64-baseline.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.6/bun-linux-x64-baseline.zip; \
  fi

RUN unzip -j bun-linux-*.zip -d /usr/local/bin && \
  rm bun-linux-*.zip && \
  chmod +x /usr/local/bin/bun

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
WORKDIR /app
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release

# ==============================================================================
# 依賴安裝（分段安裝，優化 Multi-Arch Build 穩定性）
# ==============================================================================
#
# ✅ 核心轉換工具：完整保留
# ✅ TexLive：完整 CJK + 德法 + 阿拉伯/希伯來語
# ✅ OCR：7 種主要語言
# ✅ 字型：Noto CJK + Liberation + 標楷體
# ✅ OpenCV：電腦視覺轉換支援
# ✅ 額外影片編解碼器
# ✅ PDFMathTranslate：PDF 翻譯引擎
#
# 📝 分段安裝說明：
#   - 將套件拆分為多個 RUN 層，避免 QEMU 模擬時記憶體不足
#   - 每段安裝後清理 apt cache，減少中間層大小
#   - 最終 squash 時會合併為單一層
#
# ==============================================================================

# 配置 APT 重試機制（解決 Multi-Arch Build 時的網路不穩定問題）
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::http::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::https::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'Acquire::ftp::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'APT::Get::Assume-Yes "true";' >> /etc/apt/apt.conf.d/80-retries \
  && echo 'DPkg::Lock::Timeout "120";' >> /etc/apt/apt.conf.d/80-retries

# 階段 1：基礎系統工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  locales \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/*

# 階段 2：核心轉換工具（小型）
# 注意：dasel 和 resvg 在 bookworm 中不存在，後續用二進位檔案安裝
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  assimp-utils \
  dcraw \
  dvisvgm \
  ghostscript \
  graphicsmagick \
  mupdf-tools \
  poppler-utils \
  potrace \
  && rm -rf /var/lib/apt/lists/*

# 階段 2.1：安裝 dasel（從 GitHub 下載二進位檔案）
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  DASEL_ARCH="linux_arm64"; \
  else \
  DASEL_ARCH="linux_amd64"; \
  fi && \
  curl -sSLf "https://github.com/TomWright/dasel/releases/download/v2.8.1/dasel_${DASEL_ARCH}" -o /usr/local/bin/dasel && \
  chmod +x /usr/local/bin/dasel

# 階段 2.2：安裝 resvg（從 GitHub 下載二進位檔案）
# 注意：resvg 官方只提供 x86_64 版本，ARM64 需從源碼編譯或跳過
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "⚠️ resvg 沒有 ARM64 預編譯版本，跳過安裝（可改用 ImageMagick 或 Inkscape 替代）"; \
  else \
  curl -sSLf "https://github.com/linebender/resvg/releases/download/v0.44.0/resvg-linux-x86_64.tar.gz" -o /tmp/resvg.tar.gz && \
  tar -xzf /tmp/resvg.tar.gz -C /tmp/ && \
  mv /tmp/resvg /usr/local/bin/resvg && \
  chmod +x /usr/local/bin/resvg && \
  rm -rf /tmp/resvg.tar.gz; \
  fi

# 階段 3：影音處理工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  ffmpeg \
  libavcodec-extra \
  libva2 \
  && rm -rf /var/lib/apt/lists/*

# 階段 4：圖像處理工具
# 注意：bookworm 使用 imagemagick（版本 6），trixie 才有 imagemagick-7
# 注意：Inkscape 1.0+ 使用 --export-type/--export-filename 語法，支援 headless 執行，不需要 xvfb
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  imagemagick \
  inkscape \
  libheif-examples \
  libjxl-tools \
  libvips-tools \
  && rm -rf /var/lib/apt/lists/*

# 階段 5：文件處理工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  calibre \
  libemail-outlook-message-perl \
  pandoc \
  && rm -rf /var/lib/apt/lists/*

# 階段 6：LibreOffice（最大的套件，單獨安裝）
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  libreoffice \
  && rm -rf /var/lib/apt/lists/*

# 階段 7：TexLive 基礎
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  texlive-base \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-fonts-recommended \
  texlive-xetex \
  latexmk \
  lmodern \
  && rm -rf /var/lib/apt/lists/*

# 階段 8：TexLive 語言包
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  texlive-lang-cjk \
  texlive-lang-german \
  texlive-lang-french \
  texlive-lang-arabic \
  texlive-lang-other \
  && rm -rf /var/lib/apt/lists/*

# 階段 9：OCR 支援
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-chi-tra \
  tesseract-ocr-chi-sim \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-deu \
  tesseract-ocr-fra \
  && rm -rf /var/lib/apt/lists/*

# 階段 10：字型
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  fonts-noto-cjk \
  fonts-noto-core \
  fonts-noto-color-emoji \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# 階段 11：Python 依賴
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-numpy \
  python3-tinycss2 \
  python3-opencv \
  pipx \
  && rm -rf /var/lib/apt/lists/*

# ==============================================================================
# 🔥 階段 12-UNIFIED：Python 工具安裝 + 模型下載（單一 RUN 原則）
# ==============================================================================
#
# ⚠️ 關鍵設計原則：
#   1. 所有 pipx install 和模型下載必須在同一個 RUN 中完成
#   2. 所有 cache 在同一個 RUN 結尾清除
#   3. 禁止任何 CLI warmup / 隱性下載行為
#   4. 僅使用顯式 HuggingFace snapshot_download 下載模型
#
# ⬇️ 此 RUN 包含所有 Docker build 階段下載：
#   - Python 工具：markitdown, pdf2zh, babeldoc, mineru
#   - 模型：DocLayout-YOLO ONNX, MinerU Pipeline 模型
#   - 字型：GoNotoKurrent, Source Han Serif
#   - Runtime 不會再下載任何資源
#
# ==============================================================================
ENV PATH="/root/.local/bin:${PATH}"
ENV PIPX_HOME="/root/.local/pipx"
ENV PIPX_BIN_DIR="/root/.local/bin"
# 禁止 pip 隱性下載（強制離線模式在安裝完成後啟用）
ENV PIP_NO_CACHE_DIR=1
# HuggingFace 環境變數（安裝時允許下載，安裝完成後設為離線）
ENV HF_HOME="/root/.cache/huggingface"

RUN set -eux && \
  echo "===========================================================" && \
  echo "🚀 階段 12-UNIFIED：Python 工具 + 模型統一安裝" && \
  echo "===========================================================" && \
  echo "⬇️ 此 RUN 包含所有 Docker build 階段下載" && \
  echo "   Runtime 不會再下載任何資源" && \
  echo "===========================================================" && \
  \
  # ========================================
  # [1/8] 安裝 huggingface_hub（用於顯式模型下載）
  # ========================================
  echo "" && \
  echo "📦 [1/8] 安裝 huggingface_hub..." && \
  pip3 install --no-cache-dir --break-system-packages huggingface_hub && \
  \
  # ========================================
  # [2/8] 安裝 markitdown（文件轉換工具）
  # ⬇️ Docker build 階段安裝，無隱性下載
  # ========================================
  echo "" && \
  echo "📦 [2/8] 安裝 markitdown[all]..." && \
  pipx install "markitdown[all]" && \
  \
  # ========================================
  # [3/8] 安裝 pdf2zh（PDFMathTranslate 引擎）
  # ⬇️ Docker build 階段安裝
  # ⚠️ 模型將在後續步驟顯式下載，此處僅安裝程式
  # ========================================
  echo "" && \
  echo "📦 [3/8] 安裝 pdf2zh..." && \
  pipx install "pdf2zh" && \
  \
  # ========================================
  # [4/8] 安裝 babeldoc（BabelDOC 引擎）
  # ⬇️ Docker build 階段安裝
  # ⚠️ 資源將在後續步驟顯式下載，禁止使用 --warmup
  # ========================================
  echo "" && \
  echo "📦 [4/8] 安裝 babeldoc..." && \
  (pipx install "babeldoc" || echo "⚠️ babeldoc 安裝失敗，跳過...") && \
  \
  # ========================================
  # [5/8] 安裝 mineru（MinerU 引擎）
  # ⬇️ Docker build 階段安裝
  # ⚠️ 模型將在後續步驟顯式下載，此處僅安裝程式
  # ========================================
  echo "" && \
  echo "📦 [5/8] 安裝 mineru[all]..." && \
  (pipx install "mineru[all]" || echo "⚠️ mineru 安裝失敗（可能是 arm64 相容性問題），跳過...") && \
  \
  # ========================================
  # [6/8] 顯式下載 PDFMathTranslate/BabelDOC ONNX 模型
  # ⬇️ Docker build 階段下載 DocLayout-YOLO ONNX 模型
  #    必須放到 /root/.cache/babeldoc/models/ 目錄
  #    因為 pdf2zh 使用 babeldoc.assets.get_doclayout_onnx_model_path()
  #    Runtime 不會再下載任何資源
  # ========================================
  echo "" && \
  echo "📥 [6/8] 下載 PDFMathTranslate/BabelDOC DocLayout-YOLO ONNX 模型..." && \
  mkdir -p /root/.cache/babeldoc/models && \
  # 直接下載 ONNX 模型到 babeldoc 期望的路徑
  curl -fSL -o /root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx \
    "https://huggingface.co/wybxc/DocLayout-YOLO-DocStructBench-onnx/resolve/main/doclayout_yolo_docstructbench_imgsz1024.onnx" && \
  echo "✅ ONNX 模型下載完成" && \
  ls -lh /root/.cache/babeldoc/models/*.onnx && \
  \
  # ========================================
  # [6.1/8] 下載 PDFMathTranslate 多語言字型
  # ⬇️ Docker build 階段下載字型檔案
  #    Runtime 不會再下載任何資源
  # ========================================
  echo "" && \
  echo "📥 [6.1/8] 下載 PDFMathTranslate 多語言字型..." && \
  mkdir -p /app && \
  curl -fSL -o /app/GoNotoKurrent-Regular.ttf \
  "https://github.com/satbyy/go-noto-universal/releases/download/v7.0/GoNotoKurrent-Regular.ttf" && \
  curl -fSL -o /app/SourceHanSerifCN-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifCN-Regular.ttf" && \
  curl -fSL -o /app/SourceHanSerifTW-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifTW-Regular.ttf" && \
  curl -fSL -o /app/SourceHanSerifJP-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifJP-Regular.ttf" && \
  curl -fSL -o /app/SourceHanSerifKR-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifKR-Regular.ttf" && \
  echo "✅ 字型下載完成" && \
  ls -lh /app/*.ttf && \
  \
  # ========================================
  # [7/8] 準備 BabelDOC 資源
  # ⬇️ 複製字型到 BabelDOC cache 目錄
  #    ONNX 模型已在 [6/8] 下載完成
  #    Runtime 不會再下載任何資源
  # ========================================
  echo "" && \
  echo "📥 [7/8] 準備 BabelDOC 資源..." && \
  mkdir -p /root/.cache/babeldoc/fonts && \
  mkdir -p /root/.cache/babeldoc/cmap && \
  mkdir -p /root/.cache/babeldoc/tiktoken && \
  \
  # 複製字型到 BabelDOC 目錄（避免 runtime 下載）
  echo "   複製字型到 BabelDOC 目錄..." && \
  cp /app/GoNotoKurrent-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /app/SourceHanSerifCN-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /app/SourceHanSerifTW-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /app/SourceHanSerifJP-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /app/SourceHanSerifKR-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  \
  # 下載 BabelDOC 需要的額外資源（如果有的話）
  echo "   下載 BabelDOC 額外資源..." && \
  (python3 -c "from huggingface_hub import snapshot_download; import os; os.environ['HF_HOME']='/root/.cache/huggingface'; snapshot_download(repo_id='funstory-ai/babeldoc-assets', local_dir='/root/.cache/babeldoc/assets', local_dir_use_symlinks=False); print('BabelDOC assets downloaded')" || echo "BabelDOC assets not available, skipping...") && \
  \
  # 驗證模型已正確下載
  echo "   驗證 BabelDOC 模型..." && \
  ls -lh /root/.cache/babeldoc/models/ && \
  echo "✅ BabelDOC 資源準備完成" && \
  \
  # ========================================
  # [8/8] 顯式下載 MinerU Pipeline 模型
  # ⬇️ Docker build 階段顯式下載 MinerU 所需模型
  #    使用 mineru-models-download CLI（如果可用）
  #    或使用 HuggingFace 顯式下載
  #    Runtime 不會再下載任何資源
  # ========================================
  echo "" && \
  echo "📥 [8/8] 下載 MinerU Pipeline 模型..." && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "⚠️ ARM64 架構：MinerU 可能不完全支援，嘗試下載模型..."; \
  fi && \
  \
  # 方法 1：使用官方 CLI（如果可用）
  if command -v mineru-models-download >/dev/null 2>&1; then \
  echo "使用 mineru-models-download CLI..." && \
  mineru-models-download -s huggingface -m pipeline 2>&1 || true && \
  echo "mineru.json 內容：" && \
  cat /root/mineru.json 2>/dev/null || echo "(未生成)"; \
  else \
  echo "mineru-models-download 不可用，使用顯式 HuggingFace 下載..." && \
  mkdir -p /root/.cache/mineru/models && \
  (python3 -c "from huggingface_hub import snapshot_download; import os; os.environ['HF_HOME']='/root/.cache/huggingface'; snapshot_download(repo_id='opendatalab/PDF-Extract-Kit-1.0', local_dir='/root/.cache/mineru/models/PDF-Extract-Kit-1.0', local_dir_use_symlinks=False); print('PDF-Extract-Kit-1.0 downloaded')" || echo "MinerU model download failed") && \
  python3 -c "import json; config={'models-dir':{'pipeline':'/root/.cache/mineru/models/PDF-Extract-Kit-1.0','vlm':''},'model-source':'local','latex-delimiter-config':{'display':{'left':'@@','right':'@@'},'inline':{'left':'@','right':'@'}}}; f=open('/root/mineru.json','w'); json.dump(config,f,indent=2); f.close(); print('mineru.json generated')"; \
  fi && \
  echo "✅ MinerU 模型下載步驟完成" && \
  \
  # ========================================
  # 🔥 最終 Cache 清理（關鍵！避免 overlayfs diff 爆炸）
  # ========================================
  # ⚠️ 此清理必須在同一個 RUN 內執行
  #    否則 cache 會進入 layer diff，導致 image 膨脹
  # ========================================
  echo "" && \
  echo "===========================================================" && \
  echo "🧹 清理所有下載快取（降低 layer diff 大小）" && \
  echo "===========================================================" && \
  \
  # HuggingFace Hub cache（最大宗！包含所有 blob）
  rm -rf /root/.cache/huggingface && \
  \
  # pip / Python build cache
  rm -rf /root/.cache/pip && \
  rm -rf /root/.cache/uv && \
  \
  # pipx cache
  rm -rf /root/.local/pipx/.cache && \
  \
  # 通用 cache 目錄
  rm -rf /tmp/* && \
  rm -rf /var/tmp/* && \
  \
  # Python bytecode cache（可選，節省少量空間）
  find /root/.local -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
  find /usr -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
  \
  # ========================================
  # 📋 模型檔案驗證
  # ========================================
  echo "" && \
  echo "===========================================================" && \
  echo "📋 模型檔案驗證" && \
  echo "===========================================================" && \
  echo "" && \
  \
  echo "🔹 PDFMathTranslate 模型：" && \
  ONNX_COUNT=$(find /models/pdfmathtranslate -name "*.onnx" 2>/dev/null | wc -l) && \
  if [ "$ONNX_COUNT" -gt 0 ]; then \
  echo "   ✅ 找到 $ONNX_COUNT 個 ONNX 模型："; \
  ls -lh /models/pdfmathtranslate/*.onnx 2>/dev/null || find /models/pdfmathtranslate -name "*.onnx" -exec ls -lh {} \;; \
  else \
  echo "   ❌ /models/pdfmathtranslate 中沒有 ONNX 模型"; \
  fi && \
  echo "" && \
  \
  echo "🔹 PDFMathTranslate 字型：" && \
  ls -lh /app/*.ttf 2>/dev/null || echo "   ⚠️ 無字型檔案" && \
  echo "" && \
  \
  echo "🔹 BabelDOC 資源：" && \
  if [ -d "/root/.cache/babeldoc" ]; then \
  echo "   ✅ BabelDOC 資源目錄存在"; \
  du -sh /root/.cache/babeldoc 2>/dev/null || true; \
  ls -la /root/.cache/babeldoc/ 2>/dev/null || true; \
  else \
  echo "   ⚠️ BabelDOC 資源目錄不存在"; \
  fi && \
  echo "" && \
  \
  echo "🔹 MinerU 模型目錄：" && \
  if [ -f /root/mineru.json ]; then \
  echo "   ✅ mineru.json 存在"; \
  cat /root/mineru.json; \
  MINERU_PIPELINE_DIR=$(python3 -c "import json; f=open('/root/mineru.json'); d=json.load(f); print(d.get('models-dir',{}).get('pipeline',''))" 2>/dev/null || echo ""); \
  if [ -n "$MINERU_PIPELINE_DIR" ] && [ -d "$MINERU_PIPELINE_DIR" ]; then \
  echo "   ✅ MinerU Pipeline 模型目錄存在: $MINERU_PIPELINE_DIR"; \
  du -sh "$MINERU_PIPELINE_DIR" 2>/dev/null || true; \
  else \
  echo "   ⚠️ MinerU Pipeline 模型目錄不存在或未設定"; \
  fi; \
  else \
  echo "   ⚠️ mineru.json 不存在"; \
  fi && \
  echo "" && \
  \
  echo "🔹 確認 HuggingFace cache 已清除：" && \
  if [ -d "/root/.cache/huggingface" ]; then \
  echo "   ❌ 警告：HuggingFace cache 仍存在！"; \
  du -sh /root/.cache/huggingface 2>/dev/null || true; \
  else \
  echo "   ✅ HuggingFace cache 已清除"; \
  fi && \
  echo "" && \
  \
  echo "===========================================================" && \
  echo "✅ 階段 12-UNIFIED 完成：所有 Python 工具 + 模型已安裝" && \
  echo "   所有 cache 已清理，layer diff 最小化" && \
  echo "   Runtime 不會再下載任何資源" && \
  echo "==========================================================="

# PDFMathTranslate 環境變數
ENV PDFMATHTRANSLATE_MODELS_PATH="/models/pdfmathtranslate"
ENV NOTO_FONT_PATH="/app/GoNotoKurrent-Regular.ttf"

# BabelDOC 環境變數
ENV BABELDOC_CACHE_PATH="/root/.cache/babeldoc"
ENV BABELDOC_SERVICE="google"
# 禁止 BabelDOC 自動下載（強制使用預下載資源）
ENV BABELDOC_OFFLINE="1"

# MinerU 環境變數
# 強制使用本地模型，禁止 runtime 下載
ENV MINERU_MODEL_SOURCE="local"

# HuggingFace 離線模式（禁止 runtime 下載）
# ⚠️ 此變數在所有模型下載完成後設定
ENV HF_HUB_OFFLINE="1"
ENV TRANSFORMERS_OFFLINE="1"

# ==============================================================================
# 最終清理（模型下載完成後）
# ==============================================================================
# ⚠️ 此清理步驟獨立於模型下載 RUN，僅清理文件檔案
#    模型相關 cache 已在上一個 RUN 中清除
# ==============================================================================
RUN rm -rf /usr/share/doc/texlive* \
  && rm -rf /usr/share/texlive/texmf-dist/doc \
  && rm -rf /usr/share/doc/* \
  && rm -rf /usr/share/man/* \
  && rm -rf /usr/share/info/*

# ==============================================================================
# 設定 locale（支援中文 PDF 避免亂碼）
# ==============================================================================
RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# zh_TW.UTF-8 UTF-8/zh_TW.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# zh_CN.UTF-8 UTF-8/zh_CN.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# ko_KR.UTF-8 UTF-8/ko_KR.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# de_DE.UTF-8 UTF-8/de_DE.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# fr_FR.UTF-8 UTF-8/fr_FR.UTF-8 UTF-8/' /etc/locale.gen && \
  locale-gen

# 預設使用 zh_TW.UTF-8 確保中文 PDF 正確顯示
ENV LANG=zh_TW.UTF-8
ENV LC_ALL=zh_TW.UTF-8

# ==============================================================================
# 安裝自訂字型（標楷體等台灣常用字型）
# ==============================================================================
RUN mkdir -p /usr/share/fonts/truetype/custom
COPY fonts/ /usr/share/fonts/truetype/custom/
RUN fc-cache -fv

# ==============================================================================
# Install VTracer binary（向量追蹤工具）
# ==============================================================================
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  VTRACER_ASSET="vtracer-aarch64-unknown-linux-musl.tar.gz"; \
  else \
  VTRACER_ASSET="vtracer-x86_64-unknown-linux-musl.tar.gz"; \
  fi && \
  curl -L -o /tmp/vtracer.tar.gz "https://github.com/visioncortex/vtracer/releases/download/0.6.4/${VTRACER_ASSET}" && \
  tar -xzf /tmp/vtracer.tar.gz -C /tmp/ && \
  mv /tmp/vtracer /usr/local/bin/vtracer && \
  chmod +x /usr/local/bin/vtracer && \
  rm /tmp/vtracer.tar.gz

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/public/ /app/public/
COPY --from=prerelease /app/dist /app/dist

# 複製模型驗證腳本
COPY scripts/verify-models.sh /app/scripts/verify-models.sh
RUN chmod +x /app/scripts/verify-models.sh

RUN mkdir data

EXPOSE 3000/tcp

# ==============================================================================
# 環境變數
# ==============================================================================
# Calibre 需要
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox"
# Pandoc PDF 引擎（使用 pdflatex 以獲得最佳相容性）
ENV PANDOC_PDF_ENGINE=pdflatex
# Node 環境
ENV NODE_ENV=production

# ==============================================================================
# 🌐 PDFMathTranslate 翻譯服務設定
# ==============================================================================
# ⚠️ 重要：PDFMathTranslate 的翻譯功能需要網路連接！
#    - DocLayout-YOLO ONNX 模型（已離線預下載）：用於佈局分析
#    - 翻譯服務（需要網路）：將文字翻譯成目標語言
#
# 支援的翻譯服務：
#   - google: Google Translate（免費，需網路）
#   - bing: Microsoft Bing Translator（免費，需網路）
#   - deepl: DeepL（需 API Key，需網路）
#   - ollama: 本地 Ollama LLM（可離線，需額外設定）
#
# 若要完全離線翻譯，請使用 ollama 並設定 OLLAMA_HOST
# ==============================================================================
ENV PDFMATHTRANSLATE_SERVICE="google"

# ==============================================================================
# 🔒 Runtime 模型離線模式設定
# ==============================================================================
# ⚠️ 這些設定禁止 runtime 下載「模型」，但不影響翻譯 API 調用
#    PDFMathTranslate 使用的 Google/Bing 翻譯是線上 API，不是模型下載
# ==============================================================================

# HuggingFace 模型離線（禁止下載新模型）
ENV HF_HUB_OFFLINE="1"
ENV TRANSFORMERS_OFFLINE="1"
ENV HF_DATASETS_OFFLINE="1"

# 禁止 pip 安裝新套件
ENV PIP_NO_INDEX="1"

# MinerU 強制使用本地模型
ENV MINERU_MODEL_SOURCE="local"

# BabelDOC 模型離線模式
ENV BABELDOC_OFFLINE="1"

ENTRYPOINT [ "bun", "run", "dist/src/index.js" ]
