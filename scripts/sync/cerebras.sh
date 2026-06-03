#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Cerebras 规范..."

# Cerebras 直连 api.cerebras.ai/openapi.json 是 FastAPI 裸 dump(title=FastAPI、
# server=/prod、含内部端点)。其 SDK cerebras-cloud-sdk-python 由 Stainless 生成,
# .stats.yml 指向干净的策展规范(configured_endpoints: 4)。采用 .stats.yml 间接
# 寻址(同 anthropic-official.sh):GCS 文件名带 hash 会轮换,故只钉死 .stats.yml。
STATS_URL="https://raw.githubusercontent.com/Cerebras/cerebras-cloud-sdk-python/main/.stats.yml"
PROTOCOL="openai"
PROVIDER="cerebras"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

STATS_TMP=$(mktemp)
trap 'rm -f "$STATS_TMP"' EXIT

if ! curl -m 30 -sL "$STATS_URL" -o "$STATS_TMP"; then
    echo "❌ 无法获取 .stats.yml"
    exit 0
fi

SPEC_URL=$(sed -n 's/^openapi_spec_url:[[:space:]]*\(.*\)$/\1/p' "$STATS_TMP" \
    | tr -d '"' | tr -d "'" | xargs)

if [ -z "$SPEC_URL" ]; then
    echo "❌ .stats.yml 中未找到 openapi_spec_url"
    exit 0
fi

echo "📍 spec 源: $SPEC_URL"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Cerebras (OpenAI-compatible)" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true \
        "official-sdk-stats" \
        "Cerebras 官方 SDK cerebras-cloud-sdk-python(Stainless 生成)的 .stats.yml 指向策展规范,溯源方式同 Anthropic。策展版仅 4 端点(chat/completions/models),比直连 /openapi.json 干净。"
    echo "✅ Cerebras 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
