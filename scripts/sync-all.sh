#!/bin/bash
set -e

echo "🔄 同步所有规范..."
echo ""

# 同步所有支持自动同步的规范
for sync_script in scripts/sync/*.sh; do
    [ -f "$sync_script" ] && bash "$sync_script"
    echo ""
done

# 统计
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 同步完成统计:"
find . -name "openapi.yml" -o -name "discovery.json" | while read file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "  $file: $size"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
