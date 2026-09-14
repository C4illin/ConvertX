#!/bin/bash
set -e

if [ -n "$MAGICK_MAX_WIDTH" ]; then
  if ! [[ "$MAGICK_MAX_WIDTH" =~ ^[0-9]+$ ]]; then
    echo "Error: MAGICK_MAX_WIDTH must be a positive integer in pixels" >&2
    exit 1
  fi
fi

if [ -n "$MAGICK_MAX_HEIGHT" ]; then
  if ! [[ "$MAGICK_MAX_HEIGHT" =~ ^[0-9]+$ ]]; then
    echo "Error: MAGICK_MAX_HEIGHT must be a positive integer in pixels" >&2
    exit 1
  fi
fi

if [ -n "$MAGICK_MAX_WIDTH" ] || [ -n "$MAGICK_MAX_HEIGHT" ]; then
  POLICY_DIR="/etc/ImageMagick-7"
  POLICY_FILE="$POLICY_DIR/policy.xml"

  if [ -f "$POLICY_FILE" ] && grep -q "</policymap>" "$POLICY_FILE"; then
    [ -n "$MAGICK_MAX_WIDTH" ] && sed -i '/<policy domain="resource" name="width"/d' "$POLICY_FILE"
    [ -n "$MAGICK_MAX_HEIGHT" ] && sed -i '/<policy domain="resource" name="height"/d' "$POLICY_FILE"
    if [ -n "$MAGICK_MAX_WIDTH" ]; then
      sed -i "s|</policymap>|  <policy domain=\"resource\" name=\"width\" value=\"$MAGICK_MAX_WIDTH\"/>\n</policymap>|" "$POLICY_FILE"
    fi
    if [ -n "$MAGICK_MAX_HEIGHT" ]; then
      sed -i "s|</policymap>|  <policy domain=\"resource\" name=\"height\" value=\"$MAGICK_MAX_HEIGHT\"/>\n</policymap>|" "$POLICY_FILE"
    fi
  else
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
fi

exec bun run dist/src/index.js
