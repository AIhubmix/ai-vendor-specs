#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Jina AI 规范..."

# Jina 由其生产 API 域 api.jina.ai 自描述输出 OpenAPI(embeddings/rerank/classify +
# OpenAI 兼容 chat)。⚠️ 无 servers 块,消费方需注入 https://api.jina.ai。info.version
# 为日期戳(真在维护)。Reader(r.jina.ai)不在此 spec。
SPEC_URL="https://api.jina.ai/openapi.json"
PROTOCOL="jina"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Jina AI" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "production-host" \
        "由 Jina 生产 API 域 api.jina.ai 自描述输出。无 servers 块,消费方注入 https://api.jina.ai。Reader(r.jina.ai)不在此 spec。"
    echo "✅ Jina AI 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
