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

# 設定非互動模式（避免 debconf 等待輸入導致 build 卡住）
ENV DEBIAN_FRONTEND=noninteractive

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
ARG CACHE_BUST=5

# ==============================================================================
# 階段 12A：安裝 huggingface_hub + endesive
# ==============================================================================
# ⚠️ endesive 依賴 pykcs11，需要 C++ 編譯器和 SWIG
RUN echo "Cache bust: ${CACHE_BUST}" && \
  set -eu && \
  echo "===========================================================" && \
  echo "📦 [1/8] 安裝 huggingface_hub + endesive（PDF 簽章）..." && \
  echo "===========================================================" && \
  # 安裝 pykcs11 編譯依賴
  apt-get update && \
  apt-get install -y --no-install-recommends \
    build-essential \
    swig \
    libpcsclite-dev && \
  pip3 install --no-cache-dir --break-system-packages huggingface_hub endesive && \
  # 清理編譯依賴（保留 libpcsclite-dev runtime 需要）
  apt-get remove -y build-essential swig && \
  apt-get autoremove -y && \
  rm -rf /var/lib/apt/lists/* && \
  echo "✅ huggingface_hub + endesive 安裝完成"

# ==============================================================================
# 階段 12B：安裝 markitdown
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "📦 [2/8] 安裝 markitdown[all]..." && \
  echo "===========================================================" && \
  pipx install "markitdown[all]" && \
  echo "✅ markitdown 安裝完成"

# ==============================================================================
# 階段 12C：安裝 pdf2zh
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "📦 [3/8] 安裝 pdf2zh..." && \
  echo "===========================================================" && \
  pipx install "pdf2zh" && \
  echo "✅ pdf2zh 安裝完成"

# ==============================================================================
# 階段 12D：安裝 babeldoc
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "📦 [4/8] 安裝 babeldoc..." && \
  echo "===========================================================" && \
  (pipx install "babeldoc" && echo "✅ babeldoc 安裝完成") || \
  echo "⚠️ babeldoc 安裝失敗，跳過..."

# ==============================================================================
# 階段 12E：安裝 MinerU（⚠️ 必要套件，單獨 RUN）
# ==============================================================================
# ⚠️ 只使用 system-level 安裝（pip3 install --break-system-packages）
#    移除 pipx 方式，因為 pipx 安裝到 ~/.local/bin 不在 PATH 中
# 📝 官方推薦：pip install uv && uv pip install -U "mineru[all]"
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "📦 [5/8] 安裝 MinerU（必要套件）" && \
  echo "===========================================================" && \
  ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  echo "⚠️ ARM64 架構：MinerU 不支援，跳過安裝"; \
  else \
  echo "🔧 安裝 MinerU（amd64）..." && \
  echo "" && \
  # 先安裝 uv（官方推薦的套件管理器）
  echo "📝 步驟 1: 安裝 uv（Python 套件管理器）..." && \
  pip3 install --no-cache-dir --break-system-packages uv && \
  echo "✅ uv 安裝完成，版本：$(uv --version 2>/dev/null || echo '未知')" && \
  echo "" && \
  # 方法 1: uv pip install（官方推薦）
  echo "[嘗試 1/3] uv pip install mineru[all]...（官方推薦）" && \
  if uv pip install --system -U "mineru[all]"; then \
  echo "✅ 方法 1（uv pip）成功"; \
  else \
  echo "⚠️ 方法 1 失敗，等待 15 秒後重試..." && \
  sleep 15 && \
  # 方法 2: uv pip install 重試
  echo "[嘗試 2/3] uv pip install mineru[all]（重試）..." && \
  if uv pip install --system -U "mineru[all]"; then \
  echo "✅ 方法 2（uv pip 重試）成功"; \
  else \
  echo "⚠️ 方法 2 失敗，嘗試 pip3 直接安裝..." && \
  # 方法 3: pip3 install（最後備用）
  echo "[嘗試 3/3] pip3 install mineru[all]..." && \
  pip3 install --no-cache-dir --break-system-packages "mineru[all]" && \
  echo "✅ 方法 3（pip3）成功"; \
  fi; \
  fi && \
  echo "" && \
  # 驗證安裝結果
  echo "📋 驗證 MinerU 安裝..." && \
  echo "PATH: $PATH" && \
  echo "檢查 /usr/local/bin/mineru..." && \
  ls -la /usr/local/bin/mineru* 2>/dev/null || echo "(無 mineru 檔案)" && \
  if command -v mineru >/dev/null 2>&1; then \
  echo "✅ MinerU 安裝成功" && \
  echo "路徑：$(command -v mineru)" && \
  mineru --version 2>/dev/null || echo "(版本資訊不可用)"; \
  else \
  echo "❌ MinerU 安裝失敗" && \
  echo "診斷資訊：" && \
  echo "  Python: $(python3 --version)" && \
  echo "  pip: $(pip3 --version)" && \
  echo "  which python3: $(which python3)" && \
  python3 -c "import magic_pdf; print('magic_pdf 模組可用')" 2>/dev/null || echo "  magic_pdf 模組不可用" && \
  exit 1; \
  fi; \
  fi && \
  echo "✅ MinerU 安裝步驟完成"

# ==============================================================================
# 階段 12F：BabelDOC warmup
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "📥 [6/8] 下載 BabelDOC 完整資源（使用 --warmup）..." && \
  echo "===========================================================" && \
  mkdir -p /root/.cache/babeldoc/fonts && \
  mkdir -p /root/.cache/babeldoc/cmap && \
  mkdir -p /root/.cache/babeldoc/tiktoken && \
  if command -v babeldoc >/dev/null 2>&1; then \
  echo "使用 babeldoc --warmup 下載資源..." && \
  (babeldoc --warmup 2>&1 || echo "⚠️ babeldoc --warmup 執行完成（可能有警告）") && \
  echo "✅ BabelDOC warmup 完成"; \
  else \
  echo "⚠️ babeldoc 不可用，跳過 warmup"; \
  fi && \
  echo "驗證 BabelDOC 資源..." && \
  ls -lh /root/.cache/babeldoc/models/ 2>/dev/null || echo "(models 目錄)" && \
  ls -lh /root/.cache/babeldoc/fonts/ 2>/dev/null || echo "(fonts 目錄)" && \
  du -sh /root/.cache/babeldoc/ 2>/dev/null || true && \
  echo "✅ BabelDOC 資源準備完成"

# ==============================================================================
# 階段 12G：MinerU 模型下載
# ==============================================================================
# ⚠️ 關鍵：模型必須移動到固定目錄，不能依賴 HF cache
#    否則後續清理 HF cache 會導致 runtime 炸掉
RUN set -eu && \
  echo "===========================================================" && \
  echo "📥 [7/8] 下載 MinerU Pipeline 模型..." && \
  echo "===========================================================" && \
  ARCH=$(uname -m) && \
  MINERU_MODELS_DIR="/opt/mineru/models" && \
  if [ "$ARCH" = "aarch64" ]; then \
    echo "⚠️ ARM64 架構：MinerU 不支援，跳過模型下載"; \
  else \
    mkdir -p "$MINERU_MODELS_DIR" && \
    echo "目標目錄：$MINERU_MODELS_DIR" && \
    # 嘗試使用 mineru-models-download CLI
    if command -v mineru-models-download >/dev/null 2>&1; then \
      echo "使用 mineru-models-download CLI..." && \
      mineru-models-download -s huggingface -m pipeline && \
      # mineru-models-download 會建立 /root/mineru.json 並下載到 HF cache
      # 需要讀取 mineru.json 找到模型位置並移動
      if [ -f /root/mineru.json ]; then \
        DOWNLOADED_DIR=$(python3 -c "import json; f=open('/root/mineru.json'); d=json.load(f); print(d.get('models-dir',{}).get('pipeline',''))" 2>/dev/null || echo "") && \
        if [ -n "$DOWNLOADED_DIR" ] && [ -d "$DOWNLOADED_DIR" ]; then \
          echo "移動模型從 $DOWNLOADED_DIR 到 $MINERU_MODELS_DIR/PDF-Extract-Kit-1.0" && \
          mv "$DOWNLOADED_DIR" "$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0"; \
        fi; \
      fi; \
    else \
      echo "mineru-models-download 不可用，使用顯式 HuggingFace 下載..." && \
      python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='opendatalab/PDF-Extract-Kit-1.0', local_dir='$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0', local_dir_use_symlinks=False); print('PDF-Extract-Kit-1.0 downloaded')"; \
    fi && \
    # 產生/更新 mineru.json 指向固定目錄
    python3 -c "import json; config={'models-dir':{'pipeline':'$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0','vlm':''},'model-source':'local','latex-delimiter-config':{'display':{'left':'@@','right':'@@'},'inline':{'left':'@','right':'@'}}}; f=open('/root/mineru.json','w'); json.dump(config,f,indent=2); f.close(); print('mineru.json updated')" && \
    echo "驗證模型目錄：" && \
    ls -la "$MINERU_MODELS_DIR/" && \
    du -sh "$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0" 2>/dev/null || echo "(無法計算大小)"; \
  fi && \
  echo "✅ MinerU 模型下載步驟完成"

# ==============================================================================
# 階段 12H：Cache 清理 + 最終驗證
# ==============================================================================
RUN set -eu && \
  echo "===========================================================" && \
  echo "🧹 [8/8] 清理 Cache + 最終驗證" && \
  echo "===========================================================" && \
  \
  # Cache 清理
  rm -rf /root/.cache/huggingface && \
  rm -rf /root/.cache/pip && \
  rm -rf /root/.cache/uv && \
  rm -rf /root/.local/pipx/.cache && \
  rm -rf /tmp/* && \
  rm -rf /var/tmp/* && \
  find /root/.local -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
  find /usr -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
  echo "✅ Cache 清理完成" && \
  echo "" && \
  \
  # 模型驗證
  echo "===========================================================" && \
  echo "🔒 嚴格模型驗證（確保開箱即用）" && \
  echo "===========================================================" && \
  VALIDATION_FAILED=0 && \
  ARCH=$(uname -m) && \
  \
  echo "🔍 驗證 BabelDOC ONNX 模型..." && \
  echo "   ⏭️ 跳過驗證（模型將透過 COPY models/ 指令複製）" && \
  \
  echo "🔍 驗證 PDFMathTranslate 字型..." && \
  echo "   ⏭️ 跳過驗證（字型將透過 COPY fonts/ 指令複製）" && \
  \
  echo "🔍 驗證 MinerU 安裝..." && \
  MINERU_MODELS_DIR="/opt/mineru/models" && \
  if [ "$ARCH" = "aarch64" ]; then \
    echo "   ⚠️ ARM64 架構：跳過 MinerU 驗證"; \
  elif command -v mineru >/dev/null 2>&1; then \
    echo "   ✅ MinerU 已安裝: $(command -v mineru)" && \
    if [ -d "$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0" ]; then \
      MINERU_SIZE=$(du -sb "$MINERU_MODELS_DIR/PDF-Extract-Kit-1.0" 2>/dev/null | cut -f1 || echo "0") && \
      echo "   ✅ MinerU 模型存在於固定目錄 ($((MINERU_SIZE/1024/1024)) MB)"; \
    else \
      echo "   ⚠️ MinerU 模型目錄不存在（模型將在首次使用時下載）"; \
    fi; \
  else \
    echo "   ❌ MinerU 未安裝（amd64 必須安裝）" && \
    VALIDATION_FAILED=1; \
  fi && \
  \
  echo "" && \
  if [ "$VALIDATION_FAILED" -eq 1 ]; then \
  echo "❌ 模型驗證失敗！Image 不應發布。" && \
  exit 1; \
  else \
  echo "✅ 所有必要模型驗證通過！"; \
  fi && \
  echo "" && \
  echo "===========================================================" && \
  echo "✅ 階段 12 完成：所有 Python 工具 + 模型已安裝" && \
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

# ==============================================================================
# 複製預下載的 ONNX 模型（DocLayout-YOLO）
# ==============================================================================
# ✅ models/ 目錄包含：
#    - doclayout_yolo_docstructbench_imgsz1024.onnx (72MB)
# ==============================================================================
RUN mkdir -p /root/.cache/babeldoc/models
COPY models/ /root/.cache/babeldoc/models/

# 複製字型到 BabelDOC 目錄（供 PDFMathTranslate/BabelDOC 使用）
RUN mkdir -p /root/.cache/babeldoc/fonts && \
  cp /usr/share/fonts/truetype/custom/GoNotoKurrent-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifCN-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifTW-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifJP-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  cp /usr/share/fonts/truetype/custom/SourceHanSerifKR-Regular.ttf /root/.cache/babeldoc/fonts/ 2>/dev/null || true && \
  echo "✅ 字型已複製到 BabelDOC 目錄" && \
  ls -lh /root/.cache/babeldoc/fonts/ && \
  echo "✅ ONNX 模型已複製到 BabelDOC 目錄" && \
  ls -lh /root/.cache/babeldoc/models/

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
