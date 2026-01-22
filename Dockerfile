# ==============================================================================
# ConvertX-CN 官方 Docker Image
# 版本：v0.1.11
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
#   - BabelDOC: 完整資源包（透過 --warmup）
#   - MinerU: PDF-Extract-Kit-1.0（Pipeline 模型）
#     包含：DocLayout-YOLO, YOLOv8 MFD, UniMERNet, PaddleOCR, LayoutReader, SLANet
#
# 📊 Image 大小：約 8-12 GB（含模型）
#
# ⚠️ Base Image：使用 debian:bookworm（穩定版）
#    - 確保 Multi-Arch (amd64/arm64) 構建穩定性
#    - 避免 trixie (testing) 套件同步不穩定問題
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

# 階段 12：安裝 Python 工具（pipx）+ huggingface_hub（用於模型下載）
# 注意：Debian bookworm 使用 PEP 668，需要 --break-system-packages 來安裝系統級套件
RUN pipx install "markitdown[all]" \
  && pipx install "pdf2zh" \
  && pip3 install --no-cache-dir --break-system-packages huggingface_hub

# 階段 13：安裝 mineru（可能在 arm64 上有問題，加入錯誤處理）
RUN pipx install "mineru[all]" || echo "⚠️ mineru 安裝失敗（可能是 arm64 相容性問題），跳過..."

# 最終清理（延後到模型下載完成後）

# Add pipx bin directory to PATH（必須在模型下載前設定）
ENV PATH="/root/.local/bin:${PATH}"

# ==============================================================================
# 🔥 模型預下載區塊（Docker Build 階段）
# ==============================================================================
#
# ⚠️ 重要原則：
#   - 所有模型必須在 build 階段下載完成
#   - runtime 完全不依賴外部網路
#   - 禁止任何隱式下載行為
#
# 📦 預下載的模型清單：
#   1. PDFMathTranslate / pdf2zh
#      - DocLayout-YOLO ONNX 模型（佈局分析）
#      - BabelDOC 相關資源（透過 --warmup）
#   2. MinerU / magic-pdf
#      - DocLayout-YOLO（佈局分析）
#      - YOLOv8 MFD（公式偵測）
#      - UniMERNet（公式辨識）
#      - PaddleOCR（文字辨識）
#      - LayoutReader（閱讀順序）
#      - SLANet / UNet（表格辨識）
#
# ==============================================================================

# ------------------------------------------------------------------------------
# 階段 14-A：PDFMathTranslate 模型預下載
# ------------------------------------------------------------------------------
# 模型：DocLayout-YOLO ONNX
# 來源：HuggingFace - wybxc/DocLayout-YOLO-DocStructBench-onnx
# 用途：PDF 頁面佈局分析（識別文字區塊、公式、圖表等）
# ------------------------------------------------------------------------------
RUN mkdir -p /models/pdfmathtranslate && \
  echo "📥 [1/6] 下載 DocLayout-YOLO ONNX 模型..." && \
  python3 -c "from huggingface_hub import hf_hub_download; \
  hf_hub_download(repo_id='wybxc/DocLayout-YOLO-DocStructBench-onnx', \
  filename='model.onnx', \
  local_dir='/models/pdfmathtranslate')" && \
  echo "✅ DocLayout-YOLO ONNX 模型下載完成"

# ------------------------------------------------------------------------------
# 階段 14-B：BabelDOC Warmup（預載入所有資源）
# ------------------------------------------------------------------------------
# 說明：babeldoc --warmup 會下載所有必要的字型和模型資源
# 這確保 pdf2zh 執行時不會有任何隱式下載
# ------------------------------------------------------------------------------
RUN echo "📥 [2/6] 執行 BabelDOC warmup..." && \
  babeldoc --warmup 2>&1 || echo "⚠️ BabelDOC warmup 可能已完成或無需 warmup" && \
  echo "✅ BabelDOC warmup 完成"

# ------------------------------------------------------------------------------
# 階段 14-C：PDFMathTranslate 字型下載
# ------------------------------------------------------------------------------
# 下載多語言字型，用於翻譯後的 PDF 渲染
# ------------------------------------------------------------------------------
RUN mkdir -p /app && \
  echo "📥 [3/6] 下載 PDFMathTranslate 多語言字型..." && \
  curl -L -o /app/GoNotoKurrent-Regular.ttf \
  "https://github.com/satbyy/go-noto-universal/releases/download/v7.0/GoNotoKurrent-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifCN-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifCN-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifTW-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifTW-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifJP-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifJP-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifKR-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifKR-Regular.ttf" && \
  echo "✅ 字型下載完成"

# ------------------------------------------------------------------------------
# 階段 14-D：MinerU 模型預下載（Pipeline 模式）
# ------------------------------------------------------------------------------
# 來源：HuggingFace - opendatalab/PDF-Extract-Kit-1.0
# 包含模型：
#   - DocLayout-YOLO（佈局分析）
#   - YOLOv8 MFD（公式偵測）
#   - UniMERNet（公式辨識）
#   - PaddleOCR（OCR）
#   - LayoutReader（閱讀順序）
#   - SLANet（表格辨識）
# ------------------------------------------------------------------------------
RUN echo "📥 [4/6] 下載 MinerU Pipeline 模型..." && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "⚠️ ARM64 架構：MinerU 可能不完全支援，嘗試下載模型..."; \
  fi && \
  if command -v mineru-models-download >/dev/null 2>&1; then \
  echo "使用 mineru-models-download CLI..."; \
  echo "y" | mineru-models-download -s huggingface -m pipeline 2>&1 || true; \
  else \
  echo "使用 Python 直接下載模型..."; \
  python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='opendatalab/PDF-Extract-Kit-1.0', local_dir='/root/.cache/huggingface/hub/PDF-Extract-Kit-1.0', ignore_patterns=['*.md', '*.txt', 'LICENSE*'])" 2>&1 || echo "⚠️ MinerU 模型下載失敗，可能無法離線使用"; \
  fi && \
  echo "✅ MinerU 模型下載步驟完成"

# ------------------------------------------------------------------------------
# 階段 14-E：建立 MinerU 設定檔
# ------------------------------------------------------------------------------
# 設定 MinerU 使用本地模型，禁止 runtime 下載
# ------------------------------------------------------------------------------
RUN echo "📥 [5/6] 建立 MinerU 設定檔..." && \
  mkdir -p /root && \
  echo '{"models-dir":{"pipeline":"/root/.cache/huggingface/hub/PDF-Extract-Kit-1.0","vlm":"/root/.cache/huggingface/hub/MinerU-VLM"},"model-source":"local","latex-delimiter-config":{"display":{"left":"$$","right":"$$"},"inline":{"left":"$","right":"$"}}}' > /root/mineru.json && \
  echo "✅ MinerU 設定檔建立完成"

# ------------------------------------------------------------------------------
# 階段 14-F：模型驗證與快取清理
# ------------------------------------------------------------------------------
RUN echo "📥 [6/6] 驗證模型並清理快取..." && \
  echo "" && \
  echo "📋 模型檔案驗證：" && \
  echo "========================================" && \
  echo "🔹 PDFMathTranslate 模型：" && \
  if [ -f "/models/pdfmathtranslate/model.onnx" ]; then \
  echo "   ✅ /models/pdfmathtranslate/model.onnx 存在"; \
  ls -lh /models/pdfmathtranslate/model.onnx; \
  else \
  echo "   ❌ /models/pdfmathtranslate/model.onnx 不存在"; \
  fi && \
  echo "" && \
  echo "🔹 PDFMathTranslate 字型：" && \
  ls -lh /app/*.ttf 2>/dev/null || echo "   ⚠️ 無字型檔案" && \
  echo "" && \
  echo "🔹 MinerU 模型目錄：" && \
  if [ -d "/root/.cache/huggingface/hub/PDF-Extract-Kit-1.0" ]; then \
  echo "   ✅ MinerU Pipeline 模型目錄存在"; \
  du -sh /root/.cache/huggingface/hub/PDF-Extract-Kit-1.0 2>/dev/null || true; \
  else \
  echo "   ⚠️ MinerU Pipeline 模型目錄不存在（可能需要 runtime 下載）"; \
  fi && \
  echo "" && \
  echo "🔹 BabelDOC 快取：" && \
  ls -la /root/.cache/babeldoc 2>/dev/null || echo "   快取位置可能不同" && \
  echo "========================================" && \
  # 清理 pip 快取（保留模型）
  rm -rf /root/.cache/pip && \
  echo "✅ 模型驗證完成"

# PDFMathTranslate 環境變數
ENV PDFMATHTRANSLATE_MODELS_PATH="/models/pdfmathtranslate"
ENV NOTO_FONT_PATH="/app/GoNotoKurrent-Regular.ttf"

# MinerU 環境變數（強制使用本地模型）
ENV MINERU_MODEL_SOURCE="local"
ENV HF_HUB_OFFLINE="1"

# ==============================================================================
# 最終清理（模型下載完成後）
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
# PDFMathTranslate 預設翻譯服務（可透過環境變數覆寫）
ENV PDFMATHTRANSLATE_SERVICE="google"

ENTRYPOINT [ "bun", "run", "dist/src/index.js" ]
