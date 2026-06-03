#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Z.AI / Zhipu GLM 规范..."

# Z.AI(智谱 GLM 国际品牌)官方文档站(Mintlify)托管完整 OpenAPI(含 license/contact)。
# ⚠️ server=https://api.z.ai/api,路径自带 /paas/v4 前缀;消费方勿再追加 /v1(会 404)。
# 国内对应 open.bigmodel.cn。含 video/agents 等 GLM 原生面,故归独立协议 zhipu。
SPEC_URL="https://docs.z.ai/openapi.json"
PROTOCOL="zhipu"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Z.AI / Zhipu GLM" \
        "openapi-3.0" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "official-docs" \
        "Z.AI 官方文档站 docs.z.ai(Mintlify)托管,含 license/contact。server=https://api.z.ai/api,路径自带 /paas/v4,勿再加 /v1。国内站 open.bigmodel.cn。"
    echo "✅ Z.AI 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
