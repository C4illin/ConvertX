FROM oven/bun:1.2.12-alpine AS base
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

FROM base AS prerelease
WORKDIR /app
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# ENV NODE_ENV=production
RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release

RUN apk --no-cache add libheif-tools --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community/

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

# RUN apk --no-cache add calibre@testing --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main/

# this might be needed for some latex use cases, will add it if needed.
#   texmf-dist-fontsextra \

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder /root/.cargo/bin/resvg /usr/local/bin/resvg
COPY --from=prerelease /app/public/generated.css /app/public/
COPY . .

EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "./src/index.tsx" ]