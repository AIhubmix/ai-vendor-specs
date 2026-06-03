#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 DeepInfra 规范..."

# DeepInfra 由其生产 API 域 api.deepinfra.com 自描述输出完整 OpenAPI(server 绝对、
# 103 路径,含推理 + 账户/部署/计量管理面)。OpenAI 兼容推理 base 为 .../v1/openai。
SPEC_URL="https://api.deepinfra.com/openapi.json"
PROTOCOL="openai"
PROVIDER="deepinfra"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "DeepInfra (OpenAI-compatible)" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "production-host" \
        "由 DeepInfra 生产 API 域 api.deepinfra.com 自描述输出;OpenAI 兼容推理 base 为 https://api.deepinfra.com/v1/openai。"
    echo "✅ DeepInfra 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
