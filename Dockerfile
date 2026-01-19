# ==============================================================================
# ConvertX-CN 精簡版 Dockerfile
# 優化版本：移除 texlive-full，精簡字型與語言支援
# 目標：在 GitHub Actions 中穩定建構（解決 no space left on device）
# 支援語言：中文（繁/簡）、日文、韓文、英文、德文、法文
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
# 精簡依賴安裝（單一 RUN 層，優化 cache 與空間）
# ❌ 已移除：texlive-full, fonts-noto-extra, 多餘語言包
# ✅ 保留：核心轉換工具 + 最小 TexLive + 必要字型
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
  # === TexLive 最小集合（取代 texlive-full）===
  # texlive-base: LaTeX 核心
  # texlive-latex-base: 基本 LaTeX 類別
  # texlive-latex-recommended: 常用套件（geometry, hyperref 等）
  # texlive-fonts-recommended: 基本字型（Computer Modern 等）
  # texlive-xetex: XeTeX 引擎（Unicode/CJK 支援必需）
  # texlive-lang-cjk: 中日韓 LaTeX 支援
  # texlive-lang-german: 德文 LaTeX 支援
  # texlive-lang-french: 法文 LaTeX 支援
  texlive-base \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-fonts-recommended \
  texlive-xetex \
  texlive-lang-cjk \
  texlive-lang-german \
  texlive-lang-french \
  latexmk \
  lmodern \
  # === Pandoc 文件轉換 ===
  pandoc \
  # === OCR 支援（僅限指定語言）===
  # eng: 英文
  # chi_tra/chi_sim: 繁/簡中文
  # jpn: 日文
  # kor: 韓文
  # deu: 德文
  # fra: 法文
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-chi-tra \
  tesseract-ocr-chi-sim \
  tesseract-ocr-jpn \
  tesseract-ocr-kor \
  tesseract-ocr-deu \
  tesseract-ocr-fra \
  # === 字型（精簡版）===
  # fonts-noto-cjk: 中日韓統一字型（必需）
  # fonts-noto-core: Noto Sans/Serif Latin（歐語基礎）
  # fonts-noto-color-emoji: Emoji 支援（僅此一套）
  # fonts-liberation: Liberation 字型（Arial/Times 替代）
  # ❌ 已移除：fonts-noto-extra（包含過多語言）
  # ❌ 已移除：fonts-liberation2（重複）
  fonts-noto-cjk \
  fonts-noto-core \
  fonts-noto-color-emoji \
  fonts-liberation \
  # === Python 依賴（精簡）===
  python3 \
  python3-pip \
  python3-numpy \
  python3-tinycss2 \
  pipx \
  # === 系統工具 ===
  locales \
  # === 清理 ===
  && pipx install "markitdown[all]" \
  # 清理 apt cache
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  # 清理 pip cache
  && rm -rf /root/.cache/pip \
  # 清理 TexLive 文件（節省空間）
  && rm -rf /usr/share/doc/texlive* \
  && rm -rf /usr/share/texlive/texmf-dist/doc \
  # 清理其他文件
  && rm -rf /usr/share/doc/* \
  && rm -rf /usr/share/man/* \
  && rm -rf /usr/share/info/*

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

# ==============================================================================
# 設定 locale（僅限指定語言）
# ==============================================================================
RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# zh_TW.UTF-8 UTF-8/zh_TW.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# zh_CN.UTF-8 UTF-8/zh_CN.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# ko_KR.UTF-8 UTF-8/ko_KR.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# de_DE.UTF-8 UTF-8/de_DE.UTF-8 UTF-8/' /etc/locale.gen && \
  sed -i 's/# fr_FR.UTF-8 UTF-8/fr_FR.UTF-8 UTF-8/' /etc/locale.gen && \
  locale-gen

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

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
