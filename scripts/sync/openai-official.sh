#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 OpenAI Official 规范..."

# OpenAI 官方 org 的 openai/openai-openapi 仓库发布官方 OpenAPI 3.1 spec:其 README 写明
# openapi.yaml / openapi.json 由上游源自动同步生成,官方 SDK(openai-python / openai-node 等)
# 由此 spec 生成;openai-python / openai-node 的 README 也写明 "generated from our OpenAPI
# specification" 并链接该仓。下载地址照抄其 README 推荐的 raw URL。仓库没有跟随发布的
# tag(只有早已停更的 1.3.0 / 2.0.0),同 mistral 钉 main。
# 原 Stainless documented spec URL(app.stainless.com/api/spec/documented/openai/
# openapi.documented.yml)内容自 2026-08-04 起不再变化(语义上等于 openai-openapi
# 2026-08-03 的 d4fb706),2026-09-17 起 404;openai/official 最后一次成功同步是 2026-09-16。
SPEC_URL="https://raw.githubusercontent.com/openai/openai-openapi/main/openapi.yaml"
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
        true \
        "official-repo" \
        "OpenAI 官方 org openai 的 openai-openapi 仓库(README:官方 SDK 由此 spec 生成,openapi.yaml 由上游源自动同步);openai-python / openai-node 的 README 写明 generated from our OpenAPI specification 并链接该仓。无跟随发布的 tag,钉 main。原 Stainless documented URL 自 2026-09-17 起 404。"
    echo "✅ OpenAI Official 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
