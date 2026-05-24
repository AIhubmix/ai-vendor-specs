#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Azure OpenAI (Preview) 规范..."

# 钉死 preview 版本号。Azure 发布新 preview 时由人手动改这里(preview API 可能有 BC 变更)。
# 查看可用版本:
#   gh api repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview \
#     | jq -r '.[].name'
AZURE_API_VERSION="2025-04-01-preview"
SPEC_URL="https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview/${AZURE_API_VERSION}/inference.json"
PROTOCOL="openai"
PROVIDER="azure-preview"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "Azure OpenAI (Preview ${AZURE_API_VERSION})" \
        "openapi-3.1" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/openapi.json" \
        true
    echo "✅ Azure OpenAI Preview 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
