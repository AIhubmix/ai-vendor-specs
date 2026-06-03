#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Mistral 规范..."

# Mistral 官方 GitHub org mistralai 的 platform-docs-public 仓库(即 docs.mistral.ai 底稿)
# 内有唯一 openapi.yaml。SDK client-python 由 Speakeasy 生成,但其 spec 源在私有 registry,
# 故此 raw 文件是公开可拉取的权威源。仓库无 tag,只能钉 main。原生面(fim/ocr/agents)为主。
SPEC_URL="https://raw.githubusercontent.com/mistralai/platform-docs-public/main/openapi.yaml"
PROTOCOL="mistral"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Mistral AI" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true \
        "official-repo" \
        "Mistral 官方 org mistralai 的 platform-docs-public 仓(docs.mistral.ai 底稿)唯一 openapi.yaml;SDK 的 Speakeasy spec 源私有,此为公开权威源。仓库无 tag,钉 main。"
    echo "✅ Mistral 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
