#!/bin/bash
set -e

echo "🔄 同步所有规范..."
echo ""

bash scripts/sync/openai-official.sh && echo ""
bash scripts/sync/openai-azure.sh && echo ""
bash scripts/sync/anthropic-official.sh 2>/dev/null || true && echo ""
bash scripts/sync/anthropic-bedrock.sh && echo ""
bash scripts/sync/cohere-official.sh && echo ""
bash scripts/sync/gemini-official.sh && echo ""
bash scripts/sync/vertex-official.sh && echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 同步完成统计:"
find . -name "openapi.yml" -o -name "discovery.json" | grep -v node_modules | while read file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "  $file: $size"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
