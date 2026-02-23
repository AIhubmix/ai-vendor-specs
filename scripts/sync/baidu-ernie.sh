#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 生成百度文心规范（基于配置）..."

PROTOCOL="baidu"
PROVIDER="ernie"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"
CONFIG_FILE="scripts/configs/baidu-ernie.json"

mkdir -p "$OUTPUT_DIR"

# 从配置生成 OpenAPI 规范
if command -v node >/dev/null 2>&1; then
    if [ -f "scripts/convert/docs-to-openapi.js" ] && [ -f "$CONFIG_FILE" ]; then
        echo "📝 从配置生成 OpenAPI 规范..."
        node scripts/convert/docs-to-openapi.js "$CONFIG_FILE"
        mv scripts/configs/baidu-ernie.openapi.yml "$OUTPUT_DIR/openapi.yml" 2>/dev/null || true

        if [ -f "$OUTPUT_DIR/openapi.yml" ]; then
            create_metadata \
                "$PROTOCOL" \
                "$PROVIDER" \
                "Baidu ERNIE (文心一言)" \
                "openapi-3.0" \
                "manual-from-docs" \
                "$OUTPUT_DIR/openapi.yml" \
                false

            echo "✅ 百度文心规范生成完成"
            echo "📝 提示: 这是基于文档手动配置的规范，建议定期对照官方文档更新"
        else
            echo "❌ 生成失败"
            exit 1
        fi
    else
        echo "❌ 缺少必要的工具或配置文件"
        exit 1
    fi
else
    echo "❌ 未安装 Node.js"
    exit 1
fi
