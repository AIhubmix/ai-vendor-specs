#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Azure OpenAI 规范..."

SPEC_URL="https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-10-21/inference.json"
PROTOCOL="openai"
PROVIDER="azure"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "Azure OpenAI" \
        "openapi-3.0" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/openapi.json" \
        true
    echo "✅ Azure OpenAI 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
