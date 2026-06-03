#!/bin/bash

# 下载规范（带重试）
download_spec() {
    local url=$1
    local output=$2
    local max_retries=3

    for i in $(seq 1 $max_retries); do
        # --fail 让 4xx/5xx 返回非零;先下到临时文件,成功才覆盖原文件,避免把 404 body 写入
        local tmp="${output}.tmp"
        if curl -m 60 -fsSL "$url" -o "$tmp" 2>/dev/null; then
            mv "$tmp" "$output"
            echo "✅ 下载成功"
            return 0
        fi
        rm -f "$tmp"
        echo "⚠️  重试 $i/$max_retries..."
        sleep $((i * 2))
    done

    echo "❌ 下载失败"
    return 1
}

# 计算文件哈希
calc_hash() {
    shasum -a 256 "$1" | awk '{print $1}'
}

# 创建元数据
# 位参 8/9 可选:sourceAuthority(production-host|official-docs|official-sdk-stats)
# 与 authorityNote(中文权威性证据)。不传则不输出该两字段,向后兼容旧脚本。
create_metadata() {
    local protocol=$1
    local provider=$2
    local display_name=$3
    local spec_format=$4
    local source_url=$5
    local spec_file=$6
    local auto_sync=${7:-true}
    local source_authority=${8:-}
    local authority_note=${9:-}

    local hash=$(calc_hash "$spec_file")
    local output_dir="upstream/${protocol}/${provider}"

    # 可选权威性字段(置于 hash 与 autoSync 之间,保持 JSON 合法)
    local authority_block=""
    if [ -n "$source_authority" ]; then
        authority_block="  \"sourceAuthority\": \"$source_authority\",
  \"authorityNote\": \"$authority_note\",
"
    fi

    cat > "${output_dir}/metadata.json" << EOF
{
  "protocol": "$protocol",
  "provider": "$provider",
  "displayName": "$display_name",
  "version": "$(date +%Y-%m-%d)",
  "specFormat": "$spec_format",
  "source": "$source_url",
  "lastSynced": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hash": "sha256:$hash",
${authority_block}  "autoSync": $auto_sync
}
EOF
}
