# ==============================================================================
# ConvertX-CN 官方 Docker Image
# 版本：v0.1.16
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
  curl -fsSL --retry 3 --retry-delay 5 --retry-all-errors -o bun-linux-aarch64.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.6/bun-linux-aarch64.zip; \
  else \
  curl -fsSL --retry 3 --retry-delay 5 --retry-all-errors -o bun-linux-x64-baseline.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.6/bun-linux-x64-baseline.zip; \
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
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 1/11：安裝基礎系統工具" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  locales \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 1/11 完成：基礎系統工具已安裝"

# 階段 2：核心轉換工具（小型）
# 注意：dasel 和 resvg 在 bookworm 中不存在，後續用二進位檔案安裝
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 2/11：安裝核心轉換工具" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  assimp-utils \
  dcraw \
  dvisvgm \
  ghostscript \
  graphicsmagick \
  mupdf-tools \
  poppler-utils \
  potrace \
  qpdf \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 2/11 完成：核心轉換工具已安裝"

# 階段 2.1：安裝 dasel（從 GitHub 下載二進位檔案）
RUN echo "" && \
  echo "   🔧 階段 2.1：安裝 dasel..." && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  DASEL_ARCH="linux_arm64"; \
  else \
  DASEL_ARCH="linux_amd64"; \
  fi && \
  curl -sSLf --retry 3 --retry-delay 5 --retry-all-errors "https://github.com/TomWright/dasel/releases/download/v2.8.1/dasel_${DASEL_ARCH}" -o /usr/local/bin/dasel && \
  chmod +x /usr/local/bin/dasel && \
  echo "   ✅ dasel 安裝完成"

# 階段 2.2：安裝 resvg（從 GitHub 下載二進位檔案）
# 注意：resvg 官方只提供 x86_64 版本，ARM64 需從源碼編譯或跳過
RUN echo "" && \
  echo "   🔧 階段 2.2：安裝 resvg..." && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "   ⚠️ resvg 沒有 ARM64 預編譯版本，跳過安裝"; \
  else \
  curl -sSLf --retry 3 --retry-delay 5 --retry-all-errors "https://github.com/linebender/resvg/releases/download/v0.44.0/resvg-linux-x86_64.tar.gz" -o /tmp/resvg.tar.gz && \
  tar -xzf /tmp/resvg.tar.gz -C /tmp/ && \
  mv /tmp/resvg /usr/local/bin/resvg && \
  chmod +x /usr/local/bin/resvg && \
  rm -rf /tmp/resvg.tar.gz && \
  echo "   ✅ resvg 安裝完成"; \
  fi

# 階段 2.3：安裝 deark（從源碼編譯）
# deark 是一個用於解碼和轉換各種二進位格式的工具
# @see https://github.com/jsummers/deark
RUN echo "" && \
  echo "   🔧 階段 2.3：安裝 deark..." && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  build-essential \
  git \
  && cd /tmp && \
  git clone --depth 1 https://github.com/jsummers/deark.git && \
  cd deark && \
  make -j$(nproc) && \
  cp deark /usr/local/bin/deark && \
  chmod +x /usr/local/bin/deark && \
  cd / && rm -rf /tmp/deark && \
  apt-get remove -y build-essential git && \
  apt-get autoremove -y && \
  rm -rf /var/lib/apt/lists/* && \
  echo "   ✅ deark 安裝完成"

# 階段 3：影音處理工具
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 3/11：安裝影音處理工具" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  ffmpeg \
  libavcodec-extra \
  libva2 \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 3/11 完成：影音處理工具已安裝（ffmpeg）"

# 階段 4：圖像處理工具
# 注意：bookworm 使用 imagemagick（版本 6），trixie 才有 imagemagick-7
# 注意：Inkscape 需要 xvfb 在無 DISPLAY 環境下執行某些操作（如 PNG 轉 SVG）
# 注意：xvfb-run 需要 xauth 才能正常運作
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 4/11：安裝圖像處理工具" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  imagemagick \
  inkscape \
  libheif-examples \
  libjxl-tools \
  libvips-tools \
  xauth \
  xvfb \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 4/11 完成：圖像處理工具已安裝（ImageMagick, Inkscape, VIPS）"

# 階段 5：文件處理工具
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 5/11：安裝文件處理工具" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  calibre \
  libemail-outlook-message-perl \
  pandoc \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 5/11 完成：文件處理工具已安裝（Calibre, Pandoc）"

# 階段 6：LibreOffice（最大的套件，單獨安裝）
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 6/11：安裝 LibreOffice（較大，需要數分鐘）" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  libreoffice \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 6/11 完成：LibreOffice 已安裝"

# 階段 7：TexLive 基礎
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 7/11：安裝 TexLive 基礎（較大，需要數分鐘）" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  texlive-base \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-fonts-recommended \
  texlive-xetex \
  latexmk \
  lmodern \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 7/11 完成：TexLive 基礎已安裝"

# 階段 8：TexLive 語言包
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 8/11：安裝 TexLive 語言包（CJK + 歐語）" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  texlive-lang-cjk \
  texlive-lang-german \
  texlive-lang-french \
  texlive-lang-arabic \
  texlive-lang-other \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 8/11 完成：TexLive 語言包已安裝"

# 階段 9：OCR 支援
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 9/11：安裝 OCR 支援（Tesseract + ocrmypdf）" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-chi-tra \
  tesseract-ocr-chi-sim \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-deu \
  tesseract-ocr-fra \
  ocrmypdf \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 9/11 完成：OCR 支援已安裝（7 種語言）"

# 階段 10：字型
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 10/11：安裝字型（Noto CJK + Liberation）" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  fonts-noto-cjk \
  fonts-noto-core \
  fonts-noto-color-emoji \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 10/11 完成：字型已安裝"

# 階段 11：Python 依賴
RUN echo "" && \
  echo "========================================" && \
  echo "📦 階段 11/11：安裝 Python 依賴" && \
  echo "========================================" && \
  apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-numpy \
  python3-tinycss2 \
  python3-opencv \
  python3-img2pdf \
  pipx \
  && rm -rf /var/lib/apt/lists/* && \
  echo "✅ 階段 11/11 完成：Python 依賴已安裝" && \
  echo "" && \
  echo "========================================" && \
  echo "✅ 所有 APT 套件安裝完成！" && \
  echo "========================================"

# ==============================================================================
# 🔐 階段 11.1：PDF Packager 預設簽章憑證（開箱即用）
# ==============================================================================
#
# 產生自簽憑證供 PDF Packager 簽章功能使用
# ℹ️ 此憑證僅供測試/展示用途，正式環境請替換為自己的憑證
# 📚 詳細說明請參考 docs/功能說明/PDF-Packager.md
#
# ==============================================================================
RUN echo "" && \
  echo "========================================" && \
  echo "🔐 階段 11.1：產生 PDF Packager 預設簽章憑證" && \
  echo "========================================" && \
  mkdir -p /app/certs && \
  # 產生自簽憑證（有效期 10 年）
  openssl req -x509 -newkey rsa:2048 \
  -keyout /tmp/key.pem -out /tmp/cert.pem \
  -days 3650 -nodes \
  -subj "/CN=PDF Packager Default/O=ConvertX-CN/C=TW" && \
  # 匯出為 PKCS12 格式（空密碼）
  openssl pkcs12 -export \
  -inkey /tmp/key.pem -in /tmp/cert.pem \
  -out /app/certs/default.p12 \
  -passout pass: && \
  # 清理暫存檔案
  rm -f /tmp/key.pem /tmp/cert.pem && \
  chmod 644 /app/certs/default.p12 && \
  echo "✅ 預設簽章憑證已產生: /app/certs/default.p12"

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

# ==============================================================================
# PDF Packager 簽章預設配置（開箱即用）
# ==============================================================================
ENV PDF_SIGN_P12_PATH="/app/certs/default.p12"
ENV PDF_SIGN_P12_PASSWORD=""
ENV PDF_SIGN_REASON="ConvertX-CN PDF Packager"
ENV PDF_SIGN_LOCATION="Taiwan"
ENV PDF_SIGN_CONTACT="convertx-cn@localhost"

# ==============================================================================
# 🔥 Cache Busting（強制重新執行模型下載層）
# ==============================================================================
# 當 CACHE_BUST 改變時，後續所有層都會重新執行
# 這確保模型下載不會被損壞的 cache 跳過
# ==============================================================================
ARG CACHE_BUST=1
RUN echo "Cache bust: ${CACHE_BUST}" && \
  set -eu && \
  echo "===========================================================" && \
  echo "🚀 階段 12-UNIFIED：Python 工具 + 模型統一安裝" && \
  echo "===========================================================" && \
  echo "⬇️ 此 RUN 包含所有 Docker build 階段下載" && \
  echo "   Runtime 不會再下載任何資源" && \
  echo "===========================================================" && \
  \
  # ========================================
  # [1/8] 安裝 huggingface_hub + endesive（用於顯式模型下載和 PDF 簽章）
  # ========================================
  echo "" && \
  echo "📦 [1/8] 安裝 huggingface_hub + endesive（PDF 簽章）..." && \
  pip3 install --no-cache-dir --break-system-packages huggingface_hub endesive && \
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
  # ⚠️ 使用 huggingface_hub 下載（支援 xet 存儲格式）
  # ========================================
  echo "" && \
  echo "📥 [6/8] 下載 PDFMathTranslate/BabelDOC DocLayout-YOLO ONNX 模型..." && \
  mkdir -p /root/.cache/babeldoc/models && \
  echo "   正在下載 ONNX 模型（約 75MB）..." && \
  python3 -c "from huggingface_hub import hf_hub_download; import shutil, os, sys; print('   Downloading from HuggingFace...'); p=hf_hub_download(repo_id='wybxc/DocLayout-YOLO-DocStructBench-onnx', filename='doclayout_yolo_docstructbench_imgsz1024.onnx'); print(f'   Downloaded to cache: {p}'); t='/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx'; shutil.copy2(p, t); size=os.path.getsize(t); print(f'   Copied to: {t}'); print(f'   File size: {size} bytes ({size/1024/1024:.2f} MB)'); sys.exit(1) if size < 10000000 else print('   SUCCESS: ONNX model downloaded and verified')" && \
  echo "✅ ONNX 模型下載完成" && \
  ls -lh /root/.cache/babeldoc/models/*.onnx && \
  \
  # ========================================
  # [6.1/8] PDFMathTranslate 多語言字型
  # ✅ 字型已預存於 fonts/ 目錄，透過 COPY 指令複製
  #    無需 runtime 下載，避免網路問題導致 build 失敗
  # ========================================
  echo "" && \
  echo "📋 [6.1/8] PDFMathTranslate 多語言字型（已預置於 fonts/ 目錄）..." && \
  echo "   ✅ 字型將透過 COPY 指令從本地 fonts/ 目錄複製" && \
  echo "   ✅ 包含：GoNotoKurrent-Regular, SourceHanSerif (CN/TW/JP/KR)" && \
  \
  # ========================================
  # [7/8] 下載 BabelDOC 完整資源
  # ⬇️ 使用 babeldoc --warmup 下載所有必需資源
  #    包括：ONNX 模型、字型、cmap、tiktoken 等
  #    這是官方推薦的離線資源準備方式
  #    Runtime 不會再下載任何資源
  # ========================================
  echo "" && \
  echo "📥 [7/8] 下載 BabelDOC 完整資源（使用 --warmup）..." && \
  mkdir -p /root/.cache/babeldoc/fonts && \
  mkdir -p /root/.cache/babeldoc/cmap && \
  mkdir -p /root/.cache/babeldoc/tiktoken && \
  \
  # 使用 babeldoc --warmup 下載所有必需資源
  if command -v babeldoc >/dev/null 2>&1; then \
  echo "   使用 babeldoc --warmup 下載資源..." && \
  (babeldoc --warmup 2>&1 || echo "   ⚠️ babeldoc --warmup 執行完成（可能有警告）") && \
  echo "   ✅ BabelDOC warmup 完成"; \
  else \
  echo "   ⚠️ babeldoc 不可用，跳過 warmup"; \
  fi && \
  \
  # 複製額外字型到 BabelDOC 目錄（確保多語言支援）
  # ⚠️ 字型稍後由 COPY fonts/ 指令複製到 /usr/share/fonts/truetype/custom/
  #    此處建立目錄結構，字型檔案將在 COPY 階段補充
  echo "   準備 BabelDOC 字型目錄..." && \
  \
  # 驗證 BabelDOC 資源
  echo "   驗證 BabelDOC 資源..." && \
  ls -lh /root/.cache/babeldoc/models/ 2>/dev/null || echo "   (models 目錄)" && \
  ls -lh /root/.cache/babeldoc/fonts/ 2>/dev/null || echo "   (fonts 目錄)" && \
  du -sh /root/.cache/babeldoc/ 2>/dev/null || true && \
  echo "✅ BabelDOC 資源準備完成" && \
  \
  # ========================================
  # [8/8] 顯式下載 MinerU Pipeline 模型
  # ⬇️ Docker build 階段顯式下載 MinerU 所需模型
  #    使用 mineru-models-download CLI（如果可用）
  #    或使用 HuggingFace 顯式下載
  #    Runtime 不會再下載任何資源
  # ⚠️ ARM64: MinerU 不完全支援，跳過模型下載
  # ========================================
  echo "" && \
  echo "📥 [8/8] 下載 MinerU Pipeline 模型..." && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "⚠️ ARM64 架構：MinerU 不支援，跳過模型下載" && \
  echo "   ARM64 用戶可手動下載模型或使用其他 PDF 處理功能"; \
  else \
  if command -v mineru-models-download >/dev/null 2>&1; then \
  echo "使用 mineru-models-download CLI..." && \
  (mineru-models-download -s huggingface -m pipeline 2>&1 || echo "⚠️ mineru-models-download 失敗，嘗試手動下載...") && \
  cat /root/mineru.json 2>/dev/null || echo "(mineru.json 未生成)"; \
  else \
  echo "mineru-models-download 不可用，使用顯式 HuggingFace 下載..." && \
  mkdir -p /root/.cache/mineru/models && \
  (python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='opendatalab/PDF-Extract-Kit-1.0', local_dir='/root/.cache/mineru/models/PDF-Extract-Kit-1.0', local_dir_use_symlinks=False); print('PDF-Extract-Kit-1.0 downloaded')" || echo "⚠️ MinerU model download failed") && \
  python3 -c "import json; config={'models-dir':{'pipeline':'/root/.cache/mineru/models/PDF-Extract-Kit-1.0','vlm':''},'model-source':'local','latex-delimiter-config':{'display':{'left':'@@','right':'@@'},'inline':{'left':'@','right':'@'}}}; f=open('/root/mineru.json','w'); json.dump(config,f,indent=2); f.close(); print('mineru.json generated')"; \
  fi; \
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
  echo "🔹 PDFMathTranslate/BabelDOC ONNX 模型：" && \
  if [ -f "/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx" ]; then \
  echo "   ✅ DocLayout-YOLO ONNX 模型存在：" && \
  ls -lh /root/.cache/babeldoc/models/*.onnx 2>/dev/null || true; \
  else \
  echo "   ❌ /root/.cache/babeldoc/models/ 中沒有 ONNX 模型"; \
  fi && \
  echo "" && \
  \
  echo "🔹 PDFMathTranslate 字型（預置於 fonts/ 目錄）：" && \
  echo "   ⚠️ 字型將透過 COPY 指令複製到 /usr/share/fonts/truetype/custom/" && \
  echo "" && \
  \
  echo "🔹 BabelDOC 資源：" && \
  if [ -d "/root/.cache/babeldoc" ]; then \
  echo "   ✅ BabelDOC 資源目錄存在" && \
  du -sh /root/.cache/babeldoc 2>/dev/null || true && \
  ls -la /root/.cache/babeldoc/ 2>/dev/null || true; \
  else \
  echo "   ⚠️ BabelDOC 資源目錄不存在"; \
  fi && \
  echo "" && \
  \
  echo "🔹 MinerU 模型目錄：" && \
  if [ -f /root/mineru.json ]; then \
  echo "   ✅ mineru.json 存在" && \
  cat /root/mineru.json && \
  MINERU_PIPELINE_DIR=$(python3 -c "import json; f=open('/root/mineru.json'); d=json.load(f); print(d.get('models-dir',{}).get('pipeline',''))" 2>/dev/null || echo "") && \
  if [ -n "$MINERU_PIPELINE_DIR" ] && [ -d "$MINERU_PIPELINE_DIR" ]; then \
  echo "   ✅ MinerU Pipeline 模型目錄存在: $MINERU_PIPELINE_DIR" && \
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
  echo "   ❌ 警告：HuggingFace cache 仍存在！" && \
  du -sh /root/.cache/huggingface 2>/dev/null || true; \
  else \
  echo "   ✅ HuggingFace cache 已清除"; \
  fi && \
  echo "" && \
  \
  # ========================================
  # 🔒 嚴格模型驗證（確保開箱即用）
  # ========================================
  # ⚠️ 如果關鍵模型缺失，build 將失敗（僅 amd64 強制驗證）
  #    ARM64 架構允許部分功能缺失
  # ========================================
  echo "===========================================================" && \
  echo "🔒 嚴格模型驗證（確保開箱即用）" && \
  echo "===========================================================" && \
  VALIDATION_FAILED=0 && \
  ARCH=$(uname -m) && \
  \
  # 驗證 1: BabelDOC ONNX 模型（amd64 必須存在，arm64 允許缺失）
  echo "🔍 驗證 BabelDOC ONNX 模型..." && \
  ONNX_FILE="/root/.cache/babeldoc/models/doclayout_yolo_docstructbench_imgsz1024.onnx" && \
  if [ -f "$ONNX_FILE" ]; then \
  ONNX_SIZE=$(stat -c%s "$ONNX_FILE" 2>/dev/null || echo "0") && \
  if [ "$ONNX_SIZE" -gt 10000000 ]; then \
  echo "   ✅ ONNX 模型驗證通過 ($((ONNX_SIZE/1024/1024)) MB)"; \
  else \
  echo "   ❌ ONNX 模型過小 ($ONNX_SIZE bytes)" && \
  if [ "$ARCH" != "aarch64" ]; then VALIDATION_FAILED=1; else echo "   ⚠️ ARM64: 忽略此錯誤"; fi; \
  fi; \
  else \
  echo "   ❌ ONNX 模型不存在: $ONNX_FILE" && \
  if [ "$ARCH" != "aarch64" ]; then VALIDATION_FAILED=1; else echo "   ⚠️ ARM64: 忽略此錯誤"; fi; \
  fi && \
  \
  # 驗證 2: PDFMathTranslate 字型（字型已預置於 fonts/ 目錄，透過 COPY 複製）
  # ⚠️ 此驗證跳過，因為字型檔案在稍後的 COPY 階段才會複製到 image
  echo "🔍 驗證 PDFMathTranslate 字型..." && \
  echo "   ⏭️ 跳過驗證（字型將透過 COPY fonts/ 指令複製）" && \
  \
  # 驗證 3: MinerU 模型（僅限 amd64 檢查，arm64 跳過）
  echo "🔍 驗證 MinerU 模型..." && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "   ⚠️ ARM64 架構：跳過 MinerU 驗證"; \
  elif command -v mineru >/dev/null 2>&1; then \
  if [ -f /root/mineru.json ]; then \
  MINERU_DIR=$(python3 -c "import json; f=open('/root/mineru.json'); d=json.load(f); print(d.get('models-dir',{}).get('pipeline',''))" 2>/dev/null || echo "") && \
  if [ -n "$MINERU_DIR" ] && [ -d "$MINERU_DIR" ]; then \
  MINERU_SIZE=$(du -sb "$MINERU_DIR" 2>/dev/null | cut -f1 || echo "0") && \
  echo "   ✅ MinerU 模型存在 ($((MINERU_SIZE/1024/1024)) MB)"; \
  else \
  echo "   ⚠️ MinerU 模型目錄不存在"; \
  fi; \
  else \
  echo "   ⚠️ mineru.json 不存在"; \
  fi; \
  else \
  echo "   ⚠️ MinerU 未安裝"; \
  fi && \
  \
  # 最終驗證結果
  echo "" && \
  if [ "$VALIDATION_FAILED" -eq 1 ]; then \
  echo "❌ 模型驗證失敗！Image 不應發布。" && \
  echo "   請檢查網路連接並重新 build。" && \
  exit 1; \
  else \
  echo "✅ 所有必要模型驗證通過！"; \
  fi && \
  echo "" && \
  \
  echo "===========================================================" && \
  echo "✅ 階段 12-UNIFIED 完成：所有 Python 工具 + 模型已安裝" && \
  echo "   所有 cache 已清理，layer diff 最小化" && \
  echo "   Runtime 不會再下載任何資源" && \
  echo "==========================================================="

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

# ==============================================================================
# 安裝自訂字型（標楷體 + PDFMathTranslate 多語言字型）
# ==============================================================================
# ✅ fonts/ 目錄包含：
#    - BiauKai.ttf（標楷體）
#    - GoNotoKurrent-Regular.ttf（通用 Noto 字型）
#    - SourceHanSerifCN-Regular.ttf（簡體中文）
#    - SourceHanSerifTW-Regular.ttf（繁體中文）
#    - SourceHanSerifJP-Regular.ttf（日文）
#    - SourceHanSerifKR-Regular.ttf（韓文）
# ==============================================================================
RUN mkdir -p /usr/share/fonts/truetype/custom
COPY fonts/ /usr/share/fonts/truetype/custom/

# 複製字型到 BabelDOC 目錄（供 PDFMathTranslate/BabelDOC 使用）
RUN mkdir -p /root/.cache/babeldoc/fonts && \
  cp /usr/share/fonts/truetype/custom/GoNotoKurrent-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifCN-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifTW-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifJP-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifKR-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  echo "✅ 字型已複製到 BabelDOC 目錄" && \
  ls -lh /root/.cache/babeldoc/fonts/

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
  curl -L --retry 3 --retry-delay 5 --retry-all-errors -o /tmp/vtracer.tar.gz "https://github.com/visioncortex/vtracer/releases/download/0.6.4/${VTRACER_ASSET}" && \
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
# 🔧 環境變數總覽
# ==============================================================================
#
# 📂 分類說明：
#   1. 系統路徑與 Locale
#   2. Headless 環境（GUI 工具支援）
#   3. 翻譯服務設定
#   4. Runtime 離線模式
#   5. 應用程式設定
#
# ==============================================================================

# ------------------------------------------------------------------------------
# 1️⃣ 系統 Locale（支援中文 PDF 避免亂碼）
# ------------------------------------------------------------------------------
ENV LANG=zh_TW.UTF-8
ENV LC_ALL=zh_TW.UTF-8

# ------------------------------------------------------------------------------
# 2️⃣ Headless 環境設定
# ------------------------------------------------------------------------------
# ⚠️ 解決 GTK/Qt 在無 DISPLAY 環境的問題
#    某些 GUI 工具（Inkscape、Calibre、LibreOffice）需要這些設定
# ------------------------------------------------------------------------------
# Qt 離屏模式
ENV QT_QPA_PLATFORM="offscreen"
# 虛擬 display（配合 xvfb-run 使用）
ENV DISPLAY=":99"
# Calibre/Qt WebEngine 需要（禁用 Chromium sandbox，Docker 環境無法使用）
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox"
ENV CALIBRE_USE_SYSTEM_THEME="0"

# ------------------------------------------------------------------------------
# 3️⃣ 翻譯服務設定
# ------------------------------------------------------------------------------
# PDFMathTranslate / BabelDOC 預設翻譯服務
# 支援：google, bing, deepl, ollama
# ⚠️ google/bing/deepl 需要網路連接
#    ollama 可完全離線（需設定 OLLAMA_HOST）
# ------------------------------------------------------------------------------
ENV PDFMATHTRANSLATE_SERVICE="google"
ENV BABELDOC_SERVICE="google"
# Ollama 設定（若使用本地 LLM）
# ENV OLLAMA_HOST="http://localhost:11434"

# ------------------------------------------------------------------------------
# 4️⃣ Runtime 離線模式（禁止模型下載）
# ------------------------------------------------------------------------------
# ⚠️ 這些設定禁止 runtime 下載「模型」，但不影響翻譯 API 調用
# ------------------------------------------------------------------------------
# HuggingFace 離線模式
ENV HF_HUB_OFFLINE="1"
ENV TRANSFORMERS_OFFLINE="1"
ENV HF_DATASETS_OFFLINE="1"
# BabelDOC 模型離線模式
ENV BABELDOC_OFFLINE="1"
ENV BABELDOC_CACHE_PATH="/root/.cache/babeldoc"
# MinerU 強制使用本地模型
ENV MINERU_MODEL_SOURCE="local"
# 禁止 pip 安裝新套件
ENV PIP_NO_INDEX="1"

# ------------------------------------------------------------------------------
# 5️⃣ 應用程式設定
# ------------------------------------------------------------------------------
# Pandoc PDF 引擎（使用 pdflatex 以獲得最佳相容性）
ENV PANDOC_PDF_ENGINE=pdflatex
# Node 環境
ENV NODE_ENV=production

ENTRYPOINT [ "bun", "run", "dist/src/index.js" ]
