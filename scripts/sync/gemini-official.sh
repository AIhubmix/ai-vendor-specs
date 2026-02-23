#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Google Gemini 规范..."

SPEC_URL='https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta'
PROTOCOL="gemini"
PROVIDER="official"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/discovery.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Google Gemini" "google-discovery" "$SPEC_URL" "$OUTPUT_DIR/discovery.json" true
    echo "✅ Google Gemini 规范同步完成"
else
    echo "❌ 同步失败（需要能访问 generativelanguage.googleapis.com）"
    exit 0
fi
