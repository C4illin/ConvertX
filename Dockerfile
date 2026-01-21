# ==============================================================================
# ConvertX-CN 官方 Docker Image
# 版本：v0.1.9
# ==============================================================================
#
# 📦 Image 說明：
#   - 這是 ConvertX-CN 官方 Docker Hub Image 的生產 Dockerfile
#   - 已內建完整功能，無需額外擴充
#
# 🌍 內建語言支援：
#   - OCR: 英文、繁體中文、簡體中文、日文、韓文、德文、法文
#   - Locale: en_US, zh_TW, zh_CN, ja_JP, ko_KR, de_DE, fr_FR
#   - 字型: Noto CJK, Liberation, 標楷體
#   - LaTeX: CJK、德文、法文、阿拉伯語、希伯來語
#
# 📊 Image 大小：約 5-7 GB
#
# ==============================================================================

FROM debian:trixie-slim AS base
LABEL org.opencontainers.image.source="https://github.com/pi-docket/ConvertX-CN"
LABEL org.opencontainers.image.description="ConvertX-CN - 精簡版檔案轉換服務"
WORKDIR /app

# install bun
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  unzip \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# if architecture is arm64, use the arm64 version of bun
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  curl -fsSL -o bun-linux-aarch64.zip https://github.com/oven-sh/bun/releases/download/bun-v1.2.2/bun-linux-aarch64.zip; \
  else \
  curl -fsSL -o bun-linux-x64-baseline.zip https://github.com/oven-sh/bun/releases/download/bun-v1.2.2/bun-linux-x64-baseline.zip; \
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

# 階段 1：基礎系統工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  locales \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/*

# 階段 2：核心轉換工具（小型）
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  assimp-utils \
  dasel \
  dcraw \
  dvisvgm \
  ghostscript \
  graphicsmagick \
  mupdf-tools \
  poppler-utils \
  potrace \
  resvg \
  && rm -rf /var/lib/apt/lists/*

# 階段 3：影音處理工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  ffmpeg \
  libavcodec-extra \
  libva2 \
  && rm -rf /var/lib/apt/lists/*

# 階段 4：圖像處理工具
RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends \
  imagemagick-7.q16 \
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

# 階段 12：安裝 Python 工具（pipx）
RUN pipx install "markitdown[all]" \
  && pipx install "pdf2zh" \
  && rm -rf /root/.cache/pip

# 階段 13：安裝 mineru（可能在 arm64 上有問題，加入錯誤處理）
RUN pipx install "mineru[all]" || echo "⚠️ mineru 安裝失敗（可能是 arm64 相容性問題），跳過..." \
  && rm -rf /root/.cache/pip

# 最終清理
RUN rm -rf /usr/share/doc/texlive* \
  && rm -rf /usr/share/texlive/texmf-dist/doc \
  && rm -rf /usr/share/doc/* \
  && rm -rf /usr/share/man/* \
  && rm -rf /usr/share/info/*

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

# ==============================================================================
# PDFMathTranslate 模型預下載（Docker build 階段）
# ==============================================================================
# 
# ⚠️ 重要：模型必須在 build 階段下載，禁止 runtime 隱式下載
# 
# 模型說明：
#   - DocLayout-YOLO ONNX 模型：用於 PDF 布局分析
#   - 多語言字型：用於翻譯後的 PDF 渲染
#
# ==============================================================================
RUN mkdir -p /models/pdfmathtranslate && \
  # 預先下載 DocLayout-YOLO ONNX 模型
  python3 -c "from huggingface_hub import hf_hub_download; \
  hf_hub_download(repo_id='wybxc/DocLayout-YOLO-DocStructBench-onnx', \
  filename='model.onnx', \
  local_dir='/models/pdfmathtranslate')" && \
  # 執行 babeldoc warmup 預載入模型
  babeldoc --warmup || true && \
  # 清理 cache
  rm -rf /root/.cache/huggingface

# 下載 PDFMathTranslate 所需字型
RUN mkdir -p /app && \
  curl -L -o /app/GoNotoKurrent-Regular.ttf \
  "https://github.com/satbyy/go-noto-universal/releases/download/v7.0/GoNotoKurrent-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifCN-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifCN-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifTW-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifTW-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifJP-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifJP-Regular.ttf" && \
  curl -L -o /app/SourceHanSerifKR-Regular.ttf \
  "https://github.com/timelic/source-han-serif/releases/download/main/SourceHanSerifKR-Regular.ttf"

# PDFMathTranslate 環境變數
ENV PDFMATHTRANSLATE_MODELS_PATH="/models/pdfmathtranslate"
ENV NOTO_FONT_PATH="/app/GoNotoKurrent-Regular.ttf"

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
