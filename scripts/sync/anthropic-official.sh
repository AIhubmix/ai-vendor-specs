#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Anthropic Official 规范..."

# Anthropic 不公开发布独立 OpenAPI 文件,但 anthropic-sdk-python / -typescript
# 由 Stainless 生成,.stats.yml 中记录了上游 spec 的 GCS URL。
# 每次 SDK 重新生成时 .stats.yml 会被 stainless-bot 更新,所以这是
# 当前能拿到的最权威动态指针。
STATS_URL="https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/.stats.yml"
PROTOCOL="anthropic"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

# 从 .stats.yml 中解析 openapi_spec_url
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
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "Anthropic Claude" \
        "openapi-3.1" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/openapi.yml" \
        true
    echo "✅ Anthropic Official 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
