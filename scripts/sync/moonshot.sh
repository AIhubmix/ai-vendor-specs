#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Moonshot / Kimi 规范..."

# Moonshot 官方平台文档(Mintlify)托管完整 OpenAPI(含 /v1/chat/completions、models、
# files、batches),server=api.moonshot.cn。该 URL 现 301 跳转到 platform.kimi.com,
# download_spec 用 curl -L 自动跟随。.ai 站点为英文版(server=api.moonshot.ai)。
SPEC_URL="https://platform.moonshot.cn/docs/openapi.json"
PROTOCOL="openai"
PROVIDER="moonshot"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Moonshot AI / Kimi (OpenAI-compatible)" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "official-docs" \
        "Moonshot 官方平台文档(Mintlify)托管;server=https://api.moonshot.cn。源 URL 现 301 跳转 platform.kimi.com,curl -L 跟随。国际站 platform.moonshot.ai/docs/openapi.json(server=api.moonshot.ai)。"
    echo "✅ Moonshot 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
