#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Perplexity 规范..."

# Perplexity 官方文档站(Mintlify)托管 OpenAPI,以原生 /v1/sonar、/search 为中心,
# server=api.perplexity.ai。注意:OpenAI 兼容的 /chat/completions 在文档里有但不在此 spec,
# 故归独立协议 perplexity(忠实于厂商发布物)。
SPEC_URL="https://docs.perplexity.ai/openapi.json"
PROTOCOL="perplexity"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Perplexity Sonar" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "official-docs" \
        "Perplexity 官方文档站 docs.perplexity.ai(Mintlify)托管;server=https://api.perplexity.ai。spec 以原生 /v1/sonar 为中心,OpenAI 兼容 /chat/completions 未含在内。"
    echo "✅ Perplexity 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
