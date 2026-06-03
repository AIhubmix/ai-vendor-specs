#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Ideogram 规范..."

# Ideogram 官方开发者站(Fern)托管 OpenAPI(图像生成原生 REST,鉴权 Api-Key 头,
# 多为 multipart/form-data),server=api.ideogram.ai。源为 .yaml,落地存为 openapi.yml。
SPEC_URL="https://developer.ideogram.ai/openapi.yaml"
PROTOCOL="ideogram"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Ideogram" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true \
        "official-docs" \
        "Ideogram 官方开发者站 developer.ideogram.ai(Fern)托管;server=https://api.ideogram.ai。原生图像生成 REST,鉴权 Api-Key 头,多为 multipart/form-data。"
    echo "✅ Ideogram 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
