FROM oven/bun:1.4.5-slim AS base
WORKDIR /app
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile
COPY . .

RUN bun run build:bin

FROM debian:testing-slim AS release
LABEL org.opencontainers.image.source="https://github.com/C4illin/ConvertX"
WORKDIR /app

# install additional dependencies 
ENV PIPX_HOME=/opt/pipx
ENV PIPX_BIN_DIR=/usr/local/bin

RUN apt-get update && apt-get install -y \
  assimp-utils \
  ca-certificates \
  calibre \
  curl \
  dasel \
  dcraw \
  djvulibre-bin \
  dvisvgm \
  ffmpeg \
  ghostscript \
  gosu \
  graphicsmagick \
  imagemagick-7.q16 \
  inkscape \
  latexmk \
  libheif-examples \
  libjxl-tools \
  libreoffice \
  libva2 \
  libvips-tools \
  libemail-address-perl \
  libemail-outlook-message-perl \
  lmodern \
  mupdf-tools \
  pandoc \
  poppler-utils \
  potrace \
  python3-numpy \
  python3-tinycss2 \
  resvg \
  texlive \
  texlive-fonts-recommended \
  texlive-latex-extra \
  texlive-latex-recommended \
  texlive-xetex \
  python3 \
  python3-pip \
  pipx \
  --no-install-recommends \
  && pipx install "markitdown[all]" \
  && rm -rf /var/lib/apt/lists/*

# Remove when patch is released
RUN pipx runpip markitdown install --upgrade --no-cache-dir "Brotli>=1.2.1" "brotlicffi>=1.2.1.0"

RUN groupadd -g 1000 convertx && \
  useradd -u 1000 -g convertx -d /home/convertx -m -s /bin/bash convertx

# Install VTracer binary
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

# Install oxidocs binary (docx, pptx and xlsx to pdf/png)
# renovate: datasource=github-releases depName=Ryujiyasu/oxi versioning=regex:^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-static\.(?<build>\d+))?$ extractVersion=^oxidocs-v(?<version>.+)$
ARG OXIDOCS_VERSION=0.9.0-static.6
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "aarch64" ]; then \
  OXIDOCS_ASSET="oxidocs-aarch64-unknown-linux-musl"; \
  else \
  OXIDOCS_ASSET="oxidocs-x86_64-unknown-linux-musl"; \
  fi && \
  curl -fL -o /tmp/oxidocs.tar.gz "https://github.com/Ryujiyasu/oxi/releases/download/oxidocs-v${OXIDOCS_VERSION}/${OXIDOCS_ASSET}.tar.gz" && \
  tar -xzf /tmp/oxidocs.tar.gz -C /tmp/ && \
  mv "/tmp/${OXIDOCS_ASSET}/oxidocs" /usr/local/bin/oxidocs && \
  chmod +x /usr/local/bin/oxidocs && \
  rm -r /tmp/oxidocs.tar.gz "/tmp/${OXIDOCS_ASSET}"

COPY --from=base /app/public/ /app/public/
COPY --from=base /app/dist/convertx /app/convertx

# COPY . .
RUN mkdir data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000/tcp
# used for calibre
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox"
ENV NODE_ENV=production
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "/app/convertx" ]

# test stage that includes Bun for running tests if needed
FROM release AS test
COPY --from=base /usr/local/bin/bun /usr/local/bin/bun

# default target remains release
FROM release
