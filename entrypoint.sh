#!/bin/bash
set -e

if [ -n "$MAGICK_MAX_WIDTH" ] || [ -n "$MAGICK_MAX_HEIGHT" ]; then
  POLICY_DIR="/etc/ImageMagick-7"
  POLICY_FILE="$POLICY_DIR/policy.xml"

  mkdir -p "$POLICY_DIR"

  echo "<policymap>" > "$POLICY_FILE"
  if [ -n "$MAGICK_MAX_WIDTH" ]; then
    echo "  <policy domain=\"resource\" name=\"width\" value=\"$MAGICK_MAX_WIDTH\"/>" >> "$POLICY_FILE"
  fi
  if [ -n "$MAGICK_MAX_HEIGHT" ]; then
    echo "  <policy domain=\"resource\" name=\"height\" value=\"$MAGICK_MAX_HEIGHT\"/>" >> "$POLICY_FILE"
  fi
  echo "</policymap>" >> "$POLICY_FILE"
fi

exec bun run dist/src/index.js
