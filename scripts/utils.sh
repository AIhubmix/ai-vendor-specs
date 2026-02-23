#!/bin/bash

# 下载规范（带重试）
download_spec() {
    local url=$1
    local output=$2
    local max_retries=3

    for i in $(seq 1 $max_retries); do
        if curl -m 60 -sL "$url" -o "$output" 2>/dev/null; then
            echo "✅ 下载成功"
            return 0
        fi
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
create_metadata() {
    local protocol=$1
    local provider=$2
    local display_name=$3
    local spec_format=$4
    local source_url=$5
    local spec_file=$6
    local auto_sync=${7:-true}

    local hash=$(calc_hash "$spec_file")
    local output_dir="${protocol}/${provider}"

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
  "autoSync": $auto_sync
}
EOF
}
