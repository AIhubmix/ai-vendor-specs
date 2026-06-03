#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 SiliconFlow 规范..."

# SiliconFlow 官方文档站(Mintlify)以此 YAML 渲染 API 参考,server 与 base 一致。
# ⚠️ 仅 /cn/ 路径存在,/en/ 为 404。
SPEC_URL="https://docs.siliconflow.cn/cn/api-reference/openapi.yaml"
PROTOCOL="openai"
PROVIDER="siliconflow"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "SiliconFlow 硅基流动 (OpenAI-compatible)" \
        "openapi-3.0" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true \
        "official-docs" \
        "SiliconFlow 官方文档站 docs.siliconflow.cn(Mintlify)渲染所用底稿;server=https://api.siliconflow.cn/v1,与 base 一致。仅 /cn/ 路径存在。"
    echo "✅ SiliconFlow 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
