#!/usr/bin/env bash
set -e

# If PUID is not set or is 0, run as root (backwards-compatible default)
if [ -z "$PUID" ] || [ "$PUID" -eq 0 ]; then
  if [ -n "$UMASK" ]; then
    umask "$UMASK"
  fi
  if [ $# -eq 0 ]; then
    set -- bun run dist/src/index.js
  fi
  exec "$@"
fi

PGID=${PGID:-$PUID}
UMASK=${UMASK:-002}

umask "$UMASK"

if ! [[ "$PUID" =~ ^[0-9]+$ ]] || ! [[ "$PGID" =~ ^[0-9]+$ ]]; then
  echo "[entrypoint] ERROR: PUID and PGID must be numeric integers." >&2
  exit 1
fi

if [ "$PGID" -ne "$(id -g convertx)" ]; then
  groupmod -o -g "$PGID" convertx
fi

if [ "$PUID" -ne "$(id -u convertx)" ]; then
  usermod -o -u "$PUID" convertx
fi

# Ensure home directory exists and is owned by convertx
mkdir -p /home/convertx
chown -R convertx:convertx /home/convertx

# Ensure /app/data exists and fix permissions if necessary
mkdir -p /app/data
find /app/data \( ! -user "$PUID" -o ! -group "$PGID" \) -exec chown "$PUID:$PGID" '{}' +

export HOME=/home/convertx

if [ $# -eq 0 ]; then
  set -- bun run dist/src/index.js
fi

exec gosu convertx "$@"

