# ==============================================================================
# ConvertX-CN API Server Dockerfile
# ==============================================================================
#
# 📦 說明：
#   - 這是 ConvertX-CN API Server 的獨立 Dockerfile
#   - 使用 Rust 編譯，提供 REST 與 GraphQL API
#   - 此 API Server 獨立於 Web UI，直接調用轉換引擎
#
# 🔧 建置方式：
#   docker build -f api-server/Dockerfile -t convertx-api .
#
# ==============================================================================

# Stage 1: Build
FROM rust:1.75-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only Cargo files first for dependency caching
COPY Cargo.toml Cargo.lock* ./

# Create a dummy main.rs to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy actual source code
COPY src ./src

# Build the actual application
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies and conversion tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    # SSL/TLS support
    ca-certificates \
    libssl3 \
    # Conversion tools (subset - main ones used by API)
    ffmpeg \
    imagemagick-7.q16 \
    graphicsmagick \
    libreoffice \
    pandoc \
    inkscape \
    potrace \
    libvips-tools \
    libheif-examples \
    libjxl-tools \
    resvg \
    dasel \
    assimp-utils \
    calibre \
    ghostscript \
    # Python for markitdown
    python3 \
    python3-pip \
    pipx \
    && pipx install "markitdown[all]" \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /root/.cache/pip

# Add pipx bin directory to PATH
ENV PATH="/root/.local/bin:${PATH}"

# Copy the compiled binary
COPY --from=builder /app/target/release/convertx-api /usr/local/bin/convertx-api

# Create data directories
RUN mkdir -p /app/data/uploads /app/data/output

# Set environment variables
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
ENV UPLOAD_DIR=/app/data/uploads
ENV OUTPUT_DIR=/app/data/output
ENV RUST_LOG=convertx_api=info,tower_http=info

# Expose API port
EXPOSE 3001/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run the API server
ENTRYPOINT ["/usr/local/bin/convertx-api"]
