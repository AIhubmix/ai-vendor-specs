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

# ── 新增 spec(2026-06 扩充)──────────────────────────────────────────
bash scripts/sync/cerebras.sh && echo ""
bash scripts/sync/deepinfra.sh && echo ""
bash scripts/sync/siliconflow.sh && echo ""
bash scripts/sync/moonshot.sh && echo ""
bash scripts/sync/zhipu-official.sh && echo ""
bash scripts/sync/mistral-official.sh && echo ""
bash scripts/sync/perplexity-official.sh && echo ""
bash scripts/sync/ideogram-official.sh && echo ""
bash scripts/sync/jina-official.sh && echo ""
bash scripts/sync/flux-official.sh && echo ""

# overlay 类(openai/{bytedance,sophnet,baidu,chutes,alibaba,yi,stepfun,nvidia,
# minimax,baichuan,xiaomi,daocloud} 及 anthropic/bedrock)仅有 overlay.yml,
# 不在此 sync(手工维护),由消费方 build 时 resolve。

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
