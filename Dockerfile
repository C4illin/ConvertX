FROM oven/bun:1.2.3-alpine AS base
LABEL org.opencontainers.image.source="https://github.com/C4illin/ConvertX"
WORKDIR /app

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

FROM base AS builder
RUN apk --no-cache add curl gcc
ENV PATH=/root/.cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN cargo install resvg

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
# will switch to alpine again when it works
FROM oven/bun:1.2.2-slim AS prerelease
WORKDIR /app
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
LABEL maintainer="Emrik Östling (C4illin)"
LABEL description="ConvertX: self-hosted online file converter supporting 700+ file formats."
LABEL repo="https://github.com/C4illin/ConvertX"

RUN apk --no-cache add qt6-qtbase-private-dev libheif-tools --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community/

# install additional dependencies
RUN apk --no-cache add  \
  pandoc \
  texlive \
  texlive-xetex \
  texmf-dist-latexextra \
  ffmpeg \
  graphicsmagick \
  ghostscript \
  vips-tools \
  vips-poppler \
  vips-jxl \
  vips-heif \
  vips-magick \
  libjxl-tools \
  assimp \
  inkscape \
  poppler-utils \
  gcompat \
  libva-utils \
  py3-numpy

RUN apk --no-cache add calibre --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing/

# this might be needed for some latex use cases, will add it if needed.
#   texmf-dist-fontsextra \

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder /root/.cargo/bin/resvg /usr/local/bin/resvg
COPY --from=prerelease /app/public/generated.css /app/public/
# COPY --from=prerelease /app/src/index.tsx /app/src/
# COPY --from=prerelease /app/package.json .
COPY . .

EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "./src/index.tsx" ]