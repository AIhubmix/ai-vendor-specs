#!/bin/bash
set -e

echo "🔄 同步所有上游 spec..."
echo ""

bash scripts/sync/openai-official.sh && echo ""
bash scripts/sync/openai-azure.sh && echo ""
bash scripts/sync/openai-azure-preview.sh && echo ""
bash scripts/sync/anthropic-official.sh && echo ""
bash scripts/sync/cohere-official.sh && echo ""
bash scripts/sync/gemini-official.sh && echo ""
bash scripts/sync/vertex-official.sh && echo ""

# anthropic/bedrock 仅有 overlay.yml(无独立 spec),由消费方 build 时 resolve

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 同步完成统计:"
find upstream -type f \( -name "openapi.yml" -o -name "openapi.json" -o -name "discovery.json" -o -name "overlay.yml" \) | sort | while read file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "  $file: $size"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔨 重新生成顶层 manifest.json..."
node scripts/build-manifest.js

echo ""
echo "🔍 检查 drift..."
node scripts/check-drift.js
