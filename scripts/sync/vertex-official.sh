#!/bin/bash
set -e

source "$(dirname "$0")/../utils.sh"

echo "🔄 同步 Google Vertex AI 规范..."

# 优先使用 GitHub 镜像（discovery-artifact-manager），不需要访问 googleapis.com
GITHUB_URL="https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries/aiplatform.v1.json"
FALLBACK_URL='https://aiplatform.googleapis.com/$discovery/rest?version=v1'
PROTOCOL="vertex"
PROVIDER="official"
OUTPUT_DIR="upstream/${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"

if download_spec "$GITHUB_URL" "$OUTPUT_DIR/discovery.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Google Vertex AI" "google-discovery" "$GITHUB_URL" "$OUTPUT_DIR/discovery.json" true
    echo "✅ Google Vertex AI 规范同步完成"
elif download_spec "$FALLBACK_URL" "$OUTPUT_DIR/discovery.json"; then
    create_metadata "$PROTOCOL" "$PROVIDER" "Google Vertex AI" "google-discovery" "$FALLBACK_URL" "$OUTPUT_DIR/discovery.json" true
    echo "✅ Google Vertex AI 规范同步完成（fallback）"
else
    echo "❌ 同步失败"
    exit 0
fi
