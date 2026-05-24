#!/bin/bash
# 验证 upstream/ 下所有上游 spec 目录结构是否齐全

echo "🔍 验证所有 upstream spec..."

errors=0

if [ ! -d "upstream" ]; then
    echo "❌ upstream/ 目录不存在"
    exit 1
fi

# 遍历 upstream/<协议>/<变体>/
for protocol_dir in upstream/*/; do
    protocol=$(basename "$protocol_dir")
    echo "检查协议: $protocol"

    for provider_dir in "$protocol_dir"*/; do
        [ ! -d "$provider_dir" ] && continue

        provider=$(basename "$provider_dir")
        full_path="upstream/$protocol/$provider"

        # metadata.json 必备
        if [ ! -f "$provider_dir/metadata.json" ]; then
            echo "❌ $full_path: 缺少 metadata.json"
            ((errors++))
            continue
        fi

        # 必须有 spec 文件或 overlay 文件二者其一
        spec_found=false
        if ls "$provider_dir"/*.yml &>/dev/null || \
           ls "$provider_dir"/openapi.json &>/dev/null || \
           ls "$provider_dir"/discovery.json &>/dev/null || \
           ls "$provider_dir"/overlay.yml &>/dev/null; then
            spec_found=true
        fi

        if [ "$spec_found" = false ]; then
            echo "❌ $full_path: 既无 spec 文件也无 overlay.yml"
            ((errors++))
            continue
        fi

        # metadata.json JSON 合法性
        if ! jq empty "$provider_dir/metadata.json" 2>/dev/null; then
            echo "❌ $full_path: metadata.json 格式错误"
            ((errors++))
            continue
        fi

        echo "✅ $full_path"
    done
done

if [ $errors -eq 0 ]; then
    echo "✅ 所有验证通过"
    exit 0
else
    echo "❌ 发现 $errors 个错误"
    exit 1
fi
