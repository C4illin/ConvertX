FROM oven/bun:1.2.12-debian AS base
LABEL org.opencontainers.image.source="https://github.com/C4illin/ConvertX"
WORKDIR /app
# use mirror source in China
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

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

FROM base AS builder-base
RUN apt-get update && apt-get install -y  \
  git \
  curl \
  wget \
  build-essential \
  pkg-config \
  meson \
  ninja-build

FROM builder-base AS builder-resvg
ENV PATH=/root/.cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN cargo install resvg

# https://www.libvips.org/install.html#:~:text=Building%20libvips%20from%20source
FROM builder-base AS builder-vips
RUN apt-get update && apt-get install -y  \
  libglib2.0-dev \
  libexpat1-dev \
  libjxl-dev \
  libpoppler-glib-dev \
  libheif-dev \
  libmagickcore-dev
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
FROM builder-base AS builder-calibre
RUN apt-get update && apt-get install -y \
  xz-utils
WORKDIR /tmp
ARG CALIBRE_VERSION=8.3.0
RUN mkdir /opt/calibre && \
  curl -L -O https://download.calibre-ebook.com/${CALIBRE_VERSION}/calibre-${CALIBRE_VERSION}-x86_64.txz && \
  tar -xf /tmp/calibre-${CALIBRE_VERSION}-x86_64.txz -C /opt/calibre

#FROM builder-base AS builder-libaom
#WORKDIR /tmp/libaom
#ARG LIBAOM_VERSION=3.9.1
#RUN git clone --depth=1 --branch="v${LIBAOM_VERSION}" https://aomedia.googlesource.com/aom && \
#  mkdir -p aom_build && \
#  cd aom_build && \
#  cmake -G "Unix Makefiles" -DCMAKE_INSTALL_PREFIX="/opt/libaom" -DENABLE_TESTS=OFF -DENABLE_NASM=on ../aom && \
#  make && make install

# https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu
FROM builder-base AS builder-ffmpeg
WORKDIR /ffbuild
# can be set to a branch "release/6.1" or to a specific version "n6.1.1".
ARG FFMPEG_VERSION=n6.1.1
RUN git clone --branch="${FFMPEG_VERSION}" --depth=1 'https://github.com/FFmpeg/FFmpeg.git' ffmpeg
WORKDIR /ffbuild/ffmpeg
# https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu
RUN apt-get update && apt-get install -y \
  autoconf \
  automake \
  cmake \
  libtool \
  texinfo \
  yasm
# flags refer to the output of ffmpeg -buildconf in the debian trixie
ENV FEATURE_FLAGS="\
  --toolchain=hardened \
  --arch=amd64 \
  --enable-gpl --enable-version3 \
  --disable-shared --enable-static \
  --disable-stripping \
  --disable-libmfx \
  --disable-omx \
  --disable-sndio \
"
# debian: 3.7.9-2+deb12u4
RUN apt-get install -y libgnutls28-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-gnutls"
# debian: 3.6.0-1+deb12u1, alpine: 3.9.1-r0
RUN apt-get install -y libaom-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libaom"
# debian: 0.17.1-1, alpine: 0.17.2-r0
RUN apt-get install -y libass-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libass"
# debian: 3.1.0+dfsg-7, alpine: 3.1.0-r3
RUN apt-get install -y libbs2b-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libbs2b"
# debian: 2.1.0-4, alpine: 2.1.0-r3
RUN apt-get install -y libcdio-dev
# debian: 10.2+2.0.1-1, alpine: 10.2.2.0.1-r2
RUN apt-get install -y libcdio-paranoia-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libcdio"
# debian: 1.0.5-1
RUN apt-get install -y libcodec2-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libcodec2"
# debian: 1.0.0-2+deb12u1, alpine: 1.4.2-r0
RUN apt-get install -y libdav1d-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libdav1d"
# debian: 2.14.1-4, alpine: 2.15.0-r1
RUN apt-get install -y libfontconfig-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libfontconfig"
# debian: 2.12.1+dfsg-5+deb12u4, alpine: 2.13.2-r0
RUN apt-get install -y libfreetype6-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libfreetype"
# debian: 1.0.8-2.1, alpine: 1.0.15-r0
RUN apt-get install -y libfribidi-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libfribidi"
## debian: 12.0.0-2, alpine: 1.3.261.1-r0
#RUN apt-get install -y glslang-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libglslang"
# debian: 0.6.3-6, alpine: 0.6.3-r1
RUN apt-get install -y libgme-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libgme"
# debian: 6.0.0+dfsg-3, alpine: 8.5.0-r0
RUN apt-get install -y libharfbuzz-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libharfbuzz"
# debian: 3.100-6
RUN apt-get install -y libmp3lame-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libmp3lame"
# debian: 1.3.1~dfsg0-1
RUN apt-get install -y libmysofa-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libmysofa"
# debian: 2.5.0-2+deb12u1, alpine: 2.5.2-r0
RUN apt-get install -y libopenjp2-7-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libopenjpeg"
# debian: 0.6.9-1, alpine: 0.7.7-r0
RUN apt-get install -y libopenmpt-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libopenmpt"
# debian: 1.3.1-3, alpine: 0.2.1-r0
RUN apt-get install -y libopus-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libopus"
# debian: 3.1.1-2
RUN apt-get install -y libshine-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libshine"
# debian: 1.1.9-3, alpine: 1.1.10-r2
RUN apt-get install -y libsnappy-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libsnappy"
# debian: 0.1.3-4, alpine: 0.1.3-r7
RUN apt-get install -y libsoxr-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libsoxr"
# debian: 1.2.1-2, alpine: 1.2.1-r2
RUN apt-get install -y libspeex-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libspeex"
# debian: 1.1.1+dfsg.1-16.1+b1, alpine: 1.1.1-r18
RUN apt-get install -y libtheora-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libtheora"
# debian: 0.4.0-2
RUN apt-get install -y libtwolame-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libtwolame"
# debian: 1.1.0-2+b1, alpine: 1.1.1-r0
RUN apt-get install -y libvidstab-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libvidstab"
# debian: 1.3.7-1, alpine: 1.3.7-r2
RUN apt-get install -y libvorbis-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libvorbis"
# debian: 1.12.0-1+deb12u3, alpine: 1.14.1-r0
RUN apt-get install -y libvpx-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libvpx"
# debian: 1.2.4-0.2+deb12u1, alpine: 1.3.2-r0
RUN apt-get install -y libwebp-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libwebp"
# debian: 3.5-2+b1, alpine: 3.6-r0
RUN apt-get install -y libx265-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libx265"
# debian: 2.9.14+dfsg-1.3~deb12u1, alpine: 2.12.7-r2
RUN apt-get install -y libxml2-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libxml2"
# debian: 1.3.7-1, alpine: 1.3.7-r2
RUN apt-get install -y libxvidcore-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libxvid"
# debian: 3.0.4+ds1-1, alpine: 3.0.5-r2
RUN apt-get install -y libzimg-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libzimg"
# debian: 1.19.1-2, alpine: 1.23.1-r0
RUN apt-get install -y libopenal-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-openal"
# debian: 1.6.0-1
RUN apt-get install -y libopengl-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-opengl"
# debian: 2023.1.1-1, alpine: 2023.3.1-r2
RUN apt-get install -y libvpl-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libvpl"
# debian: 2.2.6-4, alpine: 2.2.7-r0
RUN apt-get install -y libdc1394-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libdc1394"
# debian: 2.4.114-1+b1, alpine: 2.4.120-r0
RUN apt-get install -y libdrm-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libdrm"
## debian: 1.2.0-6+b1, alpine: 1.2.0-r3
#RUN apt-get install -y libiec61883-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libiec61883"
# debian: 1.5.1-2+b1, alpine: 1.5.1-r7
RUN apt-get install -y libchromaprint-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-chromaprint"
## debian: 0.1.2-1+b1
#RUN apt-get install -y libfrei0r-ocaml-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-frei0r"
## debian: 0.2.2-1+b1
#RUN apt-get install -y libladspa-ocaml-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-ladspa"
# debian: 1.3.4-1, alpine: 1.3.4-r1
RUN apt-get install -y libbluray-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libbluray"
# debian: 0.99.beta20-3, alpine: 0.99_beta20-r3
RUN apt-get install -y libcaca-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libcaca"
## debian: 6.1.1-1, alpine: 6.1.1-r1, disable due to "unknown flag: '--enable-libdvdnav'" on ffmpeg v6
#RUN apt-get install -y libdvdnav-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libdvdnav"
## debian: 6.1.3-1, alpine: 6.1.3-r2, disable due to "unknown flag: '--enable-libdvdread'" on ffmpeg v6
#RUN apt-get install -y libdvdread-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libdvdread"
# debian: 1.9.21~dfsg-3, alpine: 1.9.22-r4
RUN apt-get install -y libjack-jackd2-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libjack"
# debian: 16.1+dfsg1-2+b, alpine: 17.0-r0
RUN apt-get install -y libpulse-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libpulse"
# debian: 0.11.0-1+deb12u1, alpine: 0.14.0-r0
RUN apt-get install -y librabbitmq-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-librabbitmq"
# debian: 0.2.7+dfsg-1, alpine: 0.2.10-r1
RUN apt-get install -y librist-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-librist"
# debian: 0.2.7+dfsg-1, alpine: 0.2.10-r1
RUN apt-get install -y libsrt-gnutls-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libsrt"
# debian: 0.10.6-0+deb12u1, alpine: 1.11.0-r2
RUN apt-get install -y libssh-gcrypt-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libssh"
# debian: 1.4.1+dfsg-1, alpine: 2.0.0-r1
# https://gitlab.com/AOMediaCodec/SVT-AV1.git
RUN apt-get install -y libsvtav1enc-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libsvtav1"
# debian: 0.164.3095+gitbaee400-3, alpine: 0.164_git20231001-r0
RUN apt-get install -y libx264-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libx264"
# debian: 4.3.4-6, alpine: 4.3.5-r2
RUN apt-get install -y libzmq3-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libzmq"
# debian: 0.2.41-1
RUN apt-get install -y libzvbi-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libzvbi"
# debian: 0.24.14-1, alpine: 0.24.24-r1
RUN apt-get install -y liblilv-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-lv2"
# debian: 2.26.5+dfsg-1, alpine: 2.28.5-r1
RUN apt-get install -y libsdl2-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-sdl2"
## debian: 4.208.0-3, alpine: 6.338.2-r1
#RUN apt-get install -y libplacebo-dev
#ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libplacebo"
# debian: 0.5.1-6, alpine: 0.7.1-r0
RUN apt-get install -y librav1e-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-librav1e"
# debian: 0.8+5prealpha+1-15
RUN apt-get install -y libpocketsphinx-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-pocketsphinx"
# debian: 2.54.7+dfsg-1~deb12u1, alpine: 2.58.5-r0
RUN apt-get install -y librsvg2-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-librsvg"
# debian: 0.7.0-10, alpine: 0.10.2-r0
RUN apt-get install -y libjxl-dev
ENV FEATURE_FLAGS="$FEATURE_FLAGS --enable-libjxl"
# https://salsa.debian.org/multimedia-team/ffmpeg/-/blob/debian/master/debian/rules?ref_type=heads#L26
RUN ./configure \
  --extra-libs='-lpthread -lm' \
  --ld='g++' \
  --libdir=/usr/lib/x86_64-linux-gnu \
  --incdir=/usr/include/x86_64-linux-gnu \
  --prefix=/opt/ffmpeg  \
  --extra-version=$(date +%Y%m%d)  \
  $FEATURE_FLAGS && \
  make -j$(nproc) V=1 && \
  make install

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
  graphicsmagick \
  ghostscript \
  libheif-examples \
  libexif12 \
  libjxl-tools \
  assimp-utils \
  inkscape \
  poppler-utils \
  libva2 \
  python3-numpy \
  libopengl0 && \
  rm -rf /var/lib/apt/lists/*

# install dependencies for ffmpeg
RUN apt-get update && apt-get install -y  \
  libcdio19 \
  libcdio-paranoia2 \
  libvorbisenc2 \
  libdc1394-25 \
  libopenal1 \
  libjack0 \
  libcaca0 \
  libsdl2-2.0-0 \
  libpocketsphinx3 \
  libsphinxbase3 \
  libbs2b0 \
  liblilv-0-0 \
  libmysofa1 \
  libass9 \
  libvidstab1.1 \
  libzmq5 \
  libzimg2 \
  libvpl2 \
  libgme0 \
  libopenmpt0 \
  libchromaprint1 \
  libbluray2 \
  librabbitmq4 \
  librist4 \
  libsrt1.5-gnutls \
  libssh-gcrypt-4 \
  libvpx7 \
  libzvbi0 \
  libsnappy1v5 \
  libcodec2-1.0 \
  librav1e0 \
  libshine3 \
  libspeex1 \
  libsvtav1enc1 \
  libtheora0 \
  libtwolame0 \
  libx264-164 \
  libxvidcore4 \
  libsoxr0 \
  && \
  rm -rf /var/lib/apt/lists/*

# install calibre
COPY --from=builder-calibre /opt/calibre /opt/calibre
RUN /opt/calibre/calibre_postinstall

# this might be needed for some latex use cases, will add it if needed.
#   texmf-dist-fontsextra \

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder-resvg /root/.cargo/bin/resvg /usr/local/bin/resvg
COPY --from=builder-vips /tmp/vips/bin /usr
COPY --from=builder-ffmpeg /opt/ffmpeg /usr
COPY --from=prerelease /app/public/generated.css /app/public/
COPY . .


EXPOSE 3000/tcp
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "./src/index.tsx" ]
