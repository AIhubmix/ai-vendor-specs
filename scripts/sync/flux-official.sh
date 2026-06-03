#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Flux / Black Forest Labs 规范..."

# BFL 由其生产 API 域 api.bfl.ai 自描述输出 OpenAPI(异步图像生成:POST 生成端点返回
# polling_url,GET /v1/get_result 轮询;鉴权 x-key 头)。⚠️ info.version 占位 0.0.1,
# 变更检测靠 body hash 而非 version。
SPEC_URL="https://api.bfl.ai/openapi.json"
PROTOCOL="flux"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "FLUX (Black Forest Labs)" \
        "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.json" true \
        "production-host" \
        "由 BFL 生产 API 域 api.bfl.ai 自描述输出。异步图像生成(submit+poll),鉴权 x-key 头。info.version 占位 0.0.1,变更检测靠 body hash。"
    echo "✅ Flux 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
