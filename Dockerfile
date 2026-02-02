FROM debian:trixie-slim AS base
LABEL org.opencontainers.image.source="https://github.com/C4illin/ConvertX"
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

# https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L968-L1012
FROM lscr.io/linuxserver/ffmpeg:8.0.1 AS buildstage
RUN \
  echo "**** arrange files ****" && \
  mkdir -p \
    /buildout/usr/local/bin \
    /buildout/usr/local/etc/fonts \
    /buildout/usr/local/lib/libmfx-gen \
    /buildout/usr/local/lib/mfx \
    /buildout/usr/local/lib/x86_64-linux-gnu/dri \
    /buildout/usr/local/share/vulkan \
    /buildout/usr/share/fonts \
    /buildout/usr/share/libdrm \
    /buildout/etc/OpenCL/vendors && \
# changed https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L992-L994
  cp \
    /usr/local/bin/ffmpeg \
    /buildout/usr/local/bin && \
  cp \
    /usr/local/bin/ffprobe \
    /buildout/usr/local/bin && \
  cp -a \
    /usr/local/etc/fonts/* \
    /buildout/usr/local/etc/fonts/ && \
  cp -a \
    /usr/local/lib/lib*so* \
    /buildout/usr/local/lib/ && \
  cp -a \
    /usr/local/lib/libmfx-gen/*.so \
    /buildout/usr/local/lib/libmfx-gen/ && \
  cp -a \
    /usr/local/lib/mfx/*.so \
    /buildout/usr/local/lib/mfx/ && \
  cp -a \
    /usr/local/lib/x86_64-linux-gnu/lib*so* \
    /buildout/usr/local/lib/x86_64-linux-gnu/ && \
  cp -a \
    /usr/local/lib/x86_64-linux-gnu/dri/* \
    /buildout/usr/local/lib/x86_64-linux-gnu/dri/ && \
# removed https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L992-L994
  cp -a \
    /usr/share/libdrm/amdgpu.ids \
    /buildout/usr/share/libdrm/ && \
  cp -a \
    /usr/share/fonts/* \
    /buildout/usr/share/fonts/ && \
  cp -a \
    /usr/local/share/vulkan/* \
    /buildout/usr/local/share/vulkan/ && \
  echo \
    'libnvidia-opencl.so.1' > \
    /buildout/etc/OpenCL/vendors/nvidia.icd

# copy production dependencies and source code into final image
FROM base AS release

# install additional dependencies 
RUN apt-get update && apt-get install -y \
  assimp-utils \
  calibre \
  dasel \
  dcraw \
  dvisvgm \
  ghostscript \
  graphicsmagick \
  imagemagick-7.q16 \
  inkscape \
  latexmk \
  libheif-examples \
  libjxl-tools \
  libreoffice \
  libva2 \
  libvips-tools \
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

COPY --from=buildstage /buildout/ /

ARG DEBIAN_FRONTEND="noninteractive"

# https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L1023-L1027
# hardware env
ENV \
  LIBVA_DRIVERS_PATH="/usr/local/lib/x86_64-linux-gnu/dri" \
  LD_LIBRARY_PATH="/usr/local/lib" \
  NVIDIA_DRIVER_CAPABILITIES="compute,video,utility" \
  NVIDIA_VISIBLE_DEVICES="all"

# install additional dependencies 
RUN apt-get update && apt-get install -y \
# start https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L1033-L1058
  libasound2t64 \
  libedit2 \
  libelf1 \
  libexpat1 \
  libglib2.0-0 \
  libgomp1 \
  libllvm18 \
  libpciaccess0 \
  libv4l-0 \
  libwayland-client0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb-dri2-0 \
  libxcb-dri3-0 \
  libxcb-present0 \
  libxcb-randr0 \
  libxcb-shape0 \
  libxcb-shm0 \
  libxcb-sync1 \
  libxcb-xfixes0 \
  libxcb1 \
  libxext6 \
  libxfixes3 \
  libxshmfence1 \
  libxml2 \
  ocl-icd-libopencl1 && \
  echo "**** quick test ffmpeg ****" && \
  ldd /usr/local/bin/ffmpeg && \
  /usr/local/bin/ffmpeg -version
# finish https://github.com/linuxserver/docker-ffmpeg/blob/master/Dockerfile#L1033-L1058

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

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

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/public/ /app/public/
COPY --from=prerelease /app/dist /app/dist

# COPY . .
RUN mkdir data

EXPOSE 3000/tcp
# used for calibre
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox"
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "dist/src/index.js" ]
