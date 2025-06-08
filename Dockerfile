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

# copy production dependencies and source code into final image
FROM base AS release

# install additional dependencies
RUN apt-get update && apt-get install -y \
  assimp-utils \
  calibre \
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
  lmodern \
  mupdf-tools \
  pandoc \
  poppler-utils \
  potrace \
  python3-numpy \
  resvg \
  texlive \
  texlive-fonts-recommended \
  texlive-latex-extra \
  texlive-latex-recommended \
  texlive-xetex \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/public/generated.css /app/public/
COPY . .

EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "./src/index.tsx" ]