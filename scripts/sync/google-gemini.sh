#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Google Gemini 规范..."

SPEC_URL='https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta'
PROTOCOL="google"
PROVIDER="gemini"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR/scripts"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/discovery.json"; then
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "Google Gemini" \
        "google-discovery" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/discovery.json" \
        true

    # 如果有转换脚本，运行它
    if [ -f "$OUTPUT_DIR/scripts/convert-to-openapi.sh" ]; then
        bash "$OUTPUT_DIR/scripts/convert-to-openapi.sh"
    fi

    echo "✅ Google Gemini 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
