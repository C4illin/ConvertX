FROM oven/bun:1.2.12-debian AS base
LABEL org.opencontainers.image.source="https://github.com/C4illin/ConvertX"
WORKDIR /app
# use mirror source in China
# RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

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

FROM base AS builder-resvg
RUN apt-get update && apt-get install -y curl gcc
ENV PATH=/root/.cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN cargo install resvg

# https://www.libvips.org/install.html#:~:text=Building%20libvips%20from%20source
FROM base AS builder-vips
RUN apt-get update && apt-get install -y  \
  curl \
  build-essential \
  pkg-config \
  libglib2.0-dev \
  libexpat1-dev \
  libjxl-dev \
  libpoppler-glib-dev \
  libheif-dev \
  libmagickcore-dev \
  meson \
  ninja-build
ARG VIPS_VERSION=8.16.1
RUN mkdir /tmp/vips && \
  cd /tmp/vips && \
  curl -L -O https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz && \
  tar -xf vips-${VIPS_VERSION}.tar.xz
RUN cd /tmp/vips/vips-${VIPS_VERSION} && \
  mkdir /tmp/vips/bin && \
  meson setup build --default-library static --prefix /tmp/vips/bin
WORKDIR /tmp/vips/vips-${VIPS_VERSION}/build
RUN meson compile
RUN meson test
RUN meson install

# https://calibre-ebook.com/download_linux#:~:text=Manual%20binary%20install
FROM base AS builder-calibre
RUN apt-get update && apt-get install -y  \
  curl \
  xz-utils
WORKDIR /tmp
ARG CALIBRE_VERSION=8.3.0
RUN mkdir /opt/calibre && \
  curl -L -O https://download.calibre-ebook.com/${CALIBRE_VERSION}/calibre-${CALIBRE_VERSION}-x86_64.txz && \
  tar -xf /tmp/calibre-${CALIBRE_VERSION}-x86_64.txz -C /opt/calibre

FROM base AS prerelease
WORKDIR /app
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release

# install additional dependencies
RUN apt-get update && apt-get install -y  \
  pandoc \
  texlive \
  texlive-xetex \
  texlive-latex-extra \
  ffmpeg \
  graphicsmagick \
  ghostscript \
  libheif-examples \
  libexif12 \
  libjxl-tools \
  assimp-utils \
  inkscape \
  poppler-utils \
  libva2 \
  python3-numpy

# install calibre
COPY --from=builder-calibre /opt/calibre /opt/calibre
RUN apt install -y libopengl0 && \
  /opt/calibre/calibre_postinstall

# this might be needed for some latex use cases, will add it if needed.
#   texmf-dist-fontsextra \

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder-resvg /root/.cargo/bin/resvg /usr/local/bin/resvg
COPY --from=builder-vips /tmp/vips/bin /usr
COPY --from=prerelease /app/public/generated.css /app/public/
COPY . .


EXPOSE 3000/tcp
ENV NODE_ENV=production
CMD [ "run", "./src/index.tsx" ]
