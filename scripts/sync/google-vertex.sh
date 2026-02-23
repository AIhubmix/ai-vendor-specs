#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Google Vertex AI 规范..."

SPEC_URL='https://aiplatform.googleapis.com/$discovery/rest?version=v1'
PROTOCOL="google"
PROVIDER="vertex"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$SPEC_URL" "$OUTPUT_DIR/discovery.json"; then
    create_metadata \
        "$PROTOCOL" \
        "$PROVIDER" \
        "Google Vertex AI" \
        "google-discovery" \
        "$SPEC_URL" \
        "$OUTPUT_DIR/discovery.json" \
        true

    # 转换 Discovery 格式到 OpenAPI
    echo "🔄 转换 Discovery 格式到 OpenAPI..."
    if command -v node >/dev/null 2>&1; then
        if [ -f "scripts/convert/discovery-to-openapi.js" ]; then
            node scripts/convert/discovery-to-openapi.js \
                "$OUTPUT_DIR/discovery.json" \
                "$OUTPUT_DIR/openapi.yml" || echo "⚠️  转换失败，保留 Discovery 格式"
        fi
    else
        echo "⚠️  未安装 Node.js，跳过转换"
    fi

    echo "✅ Google Vertex AI 规范同步完成"
else
    echo "❌ 同步失败"
    exit 0
fi
