#!/bin/bash
# Load project-local .env file
set -o allexport
source "$(dirname "$0")/../.env"
set +o allexport
# Output the API key to Claude Code
echo "$ANTHROPIC_API_KEY"
