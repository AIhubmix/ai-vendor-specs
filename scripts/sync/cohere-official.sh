#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Cohere 规范..."

SPEC_URL="https://raw.githubusercontent.com/cohere-ai/cohere-typescript/main/fern/openapi/openapi.yml"
PROTOCOL="cohere"
PROVIDER="official"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Cohere Official" "openapi-3.0" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true
    echo "✅ Cohere 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
