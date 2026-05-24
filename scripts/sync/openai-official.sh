#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 OpenAI Official 规范..."

SPEC_URL="https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml"
PROTOCOL="openai"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "OpenAI Official" \
        "openapi-3.1" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/openapi.yml" \
        true
    echo "✅ OpenAI Official 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
