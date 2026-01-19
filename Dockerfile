# ==============================================================================
# ConvertX-CN 完整版 Dockerfile
# 內建所有轉換依賴：LibreOffice / TexLive Full / OCR / CJK 字型
# 支援 linux/amd64, linux/arm64 multi-arch build
# ==============================================================================

FROM debian:trixie-slim AS base
LABEL org.opencontainers.image.source="https://github.com/pi-docket/ConvertX-CN"
LABEL org.opencontainers.image.description="ConvertX-CN - 完整版檔案轉換服務，內建所有依賴"
WORKDIR /app

# install bun
RUN apt-get update && apt-get install -y \
  curl \
  unzip \
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
# 完整依賴安裝（單一 RUN 層，優化 cache）
# 包含：轉換工具 + TexLive Full + LibreOffice + OCR + CJK 字型
# ==============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
  # === 基礎轉換工具 ===
  assimp-utils \
  calibre \
  dasel \
  dcraw \
  dvisvgm \
  ffmpeg \
  ghostscript \
  graphicsmagick \
  imagemagick-7.q16 \
  inkscape \
  libheif-examples \
  libjxl-tools \
  libva2 \
  libvips-tools \
  libemail-outlook-message-perl \
  mupdf-tools \
  poppler-utils \
  potrace \
  resvg \
  # === LibreOffice (headless) ===
  libreoffice \
  # === TexLive 完整版（支援所有 LaTeX 需求）===
  texlive-full \
  latexmk \
  lmodern \
  # === Pandoc 文件轉換 ===
  pandoc \
  # === OCR 支援（Tesseract + 多語言包）===
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-chi-tra \
  tesseract-ocr-chi-sim \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-deu \
  # === CJK 字型（中日韓完整支援）===
  fonts-noto-cjk \
  fonts-noto-core \
  fonts-noto-extra \
  fonts-noto-color-emoji \
  # === 微軟核心字型 ===
  ttf-mscorefonts-installer \
  # === Python 依賴 ===
  python3 \
  python3-pip \
  python3-numpy \
  python3-tinycss2 \
  pipx \
  # === 系統工具 ===
  ca-certificates \
  locales \
  && pipx install "markitdown[all]" \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

# ==============================================================================
# 設定 locale（避免中文 PDF 亂碼）
# ==============================================================================
RUN sed -i 's/# zh_TW.UTF-8 UTF-8/zh_TW.UTF-8 UTF-8/' /etc/locale.gen && \
    sed -i 's/# zh_CN.UTF-8 UTF-8/zh_CN.UTF-8 UTF-8/' /etc/locale.gen && \
    sed -i 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen && \
    sed -i 's/# ko_KR.UTF-8 UTF-8/ko_KR.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen

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
# Pandoc PDF 引擎
ENV PANDOC_PDF_ENGINE=xelatex
# Node 環境
ENV NODE_ENV=production

ENTRYPOINT [ "bun", "run", "dist/src/index.js" ]
