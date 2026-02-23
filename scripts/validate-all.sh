#!/bin/bash

echo "🔍 验证所有规范..."

errors=0

# 验证目录结构（协议/供应商）
for protocol_dir in */; do
    protocol=$(basename "$protocol_dir")

    # 跳过特殊目录
    [[ "$protocol" =~ ^(scripts|docs|node_modules|\.github)$ ]] && continue

    echo "检查协议: $protocol"

    for provider_dir in "$protocol_dir"*/; do
        [ ! -d "$provider_dir" ] && continue

        provider=$(basename "$provider_dir")
        full_path="$protocol/$provider"

        # 检查 metadata.json
        if [ ! -f "$provider_dir/metadata.json" ]; then
            echo "❌ $full_path: 缺少 metadata.json"
            ((errors++))
            continue
        fi

        # 检查规范文件（YAML 或 JSON，但不是 metadata.json）
        spec_found=false
        if ls "$provider_dir"/*.yml &>/dev/null || ls "$provider_dir"/openapi.json &>/dev/null || ls "$provider_dir"/discovery.json &>/dev/null; then
            spec_found=true
        fi

        if [ "$spec_found" = false ]; then
            echo "❌ $full_path: 缺少规范文件"
            ((errors++))
            continue
        fi

        # 验证 JSON 格式
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
