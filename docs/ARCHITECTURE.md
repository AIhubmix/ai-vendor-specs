# proxy-specs 三层架构设计

## 概述

proxy-specs 采用分层设计，根据 AI 服务商规范的获取难度和自动化程度，将其分为三个层级（Tier）。

```
┌────────────────────────────────────────────────────────────┐
│ Tier 1: 有完整 OpenAPI 规范                                 │
│ ✅ 可完全自动同步                                           │
├────────────────────────────────────────────────────────────┤
│ • OpenAI Official                                          │
│ • Azure OpenAI                                             │
│ • Cohere                                                   │
└────────────────────────────────────────────────────────────┘
         ↓ 直接下载 OpenAPI/JSON 规范

┌────────────────────────────────────────────────────────────┐
│ Tier 2: 有可转换规范                                        │
│ ⚠️  需要格式转换，半自动同步                                │
├────────────────────────────────────────────────────────────┤
│ • Google Gemini    (Discovery → OpenAPI)                  │
│ • Google Vertex AI (Discovery → OpenAPI)                  │
│ • AWS Bedrock      (Botocore → OpenAPI, 待实现)            │
└────────────────────────────────────────────────────────────┘
         ↓ 下载 + 转换脚本

┌────────────────────────────────────────────────────────────┐
│ Tier 3: 仅有文档                                            │
│ ❌ 需要手动维护，基于配置生成                                │
├────────────────────────────────────────────────────────────┤
│ • Anthropic Claude (手动维护)                              │
│ • 百度文心         (配置生成)                              │
│ • 阿里通义         (配置生成)                              │
│ • 腾讯混元         (配置生成)                              │
└────────────────────────────────────────────────────────────┘
         ↓ JSON 配置 + 生成脚本
```

---

## Tier 1: 完整 OpenAPI 规范

### 特点
- ✅ 厂商提供完整的 OpenAPI/Swagger 规范文件
- ✅ 可通过 HTTP 直接下载
- ✅ 支持完全自动同步
- ✅ 规范质量高，与官方 API 一致

### 支持的服务

#### OpenAI Official
- **规范来源**: https://github.com/openai/openai-openapi
- **格式**: OpenAPI 3.1 (YAML)
- **同步脚本**: `scripts/sync/openai-official.sh`
- **自动同步**: ✅

#### Azure OpenAI
- **规范来源**: https://github.com/Azure/azure-rest-api-specs
- **格式**: OpenAPI 3.0 (JSON)
- **同步脚本**: `scripts/sync/openai-azure.sh`
- **自动同步**: ✅

#### Cohere
- **规范来源**: https://github.com/cohere-ai/cohere-typescript
- **格式**: OpenAPI 3.0 (YAML)
- **同步脚本**: `scripts/sync/cohere-official.sh`
- **自动同步**: ✅

### 实现方式

```bash
#!/bin/bash
# 示例：OpenAI Official 同步脚本

SPEC_URL="https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml"
PROTOCOL="openai"
PROVIDER="official"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

# 下载规范
download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"

# 创建元数据
create_metadata "$PROTOCOL" "$PROVIDER" "OpenAI Official" \
    "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true
```

---

## Tier 2: 可转换规范

### 特点
- ⚠️  厂商提供非 OpenAPI 格式的规范
- ⚠️  需要格式转换（Discovery、Botocore 等）
- ⚠️  半自动同步（下载 + 转换）
- ✅ 可通过工具自动转换为 OpenAPI

### 支持的服务

#### Google Gemini
- **规范来源**: https://generativelanguage.googleapis.com/$discovery/rest
- **原始格式**: Google Discovery Format
- **目标格式**: OpenAPI 3.0
- **转换工具**: `scripts/convert/discovery-to-openapi.js`
- **同步脚本**: `scripts/sync/google-gemini.sh`
- **自动同步**: ✅（下载 + 转换）

#### Google Vertex AI
- **规范来源**: https://aiplatform.googleapis.com/$discovery/rest
- **原始格式**: Google Discovery Format
- **目标格式**: OpenAPI 3.0
- **转换工具**: `scripts/convert/discovery-to-openapi.js`
- **同步脚本**: `scripts/sync/google-vertex.sh`
- **自动同步**: ✅（下载 + 转换）

#### AWS Bedrock（待实现）
- **规范来源**: AWS Botocore
- **原始格式**: Botocore Service Definition
- **目标格式**: OpenAPI 3.0
- **转换工具**: 待开发
- **自动同步**: 🚧 开发中

### 实现方式

```bash
#!/bin/bash
# 示例：Google Gemini 同步脚本

# 1. 下载 Discovery 格式
SPEC_URL='https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta'
download_spec "$SPEC_URL" "$OUTPUT_DIR/discovery.json"

# 2. 转换为 OpenAPI
node scripts/convert/discovery-to-openapi.js \
    "$OUTPUT_DIR/discovery.json" \
    "$OUTPUT_DIR/openapi.yml"

# 3. 创建元数据（保留两种格式）
create_metadata "$PROTOCOL" "$PROVIDER" "Google Gemini" \
    "google-discovery" "$SPEC_URL" "$OUTPUT_DIR/discovery.json" true
```

### 转换工具

**Discovery to OpenAPI Converter** (`scripts/convert/discovery-to-openapi.js`)

- 输入: Google Discovery Format JSON
- 输出: OpenAPI 3.0 YAML
- 功能:
  - 转换 schemas
  - 转换 resources → paths
  - 转换 methods → operations
  - 转换 authentication

---

## Tier 3: 仅有文档

### 特点
- ❌ 厂商未提供机器可读的规范文件
- ❌ 仅有人类可读的 API 文档网页
- ⚠️  需要手动维护或基于配置生成
- 📝 规范可能不完整，需要定期更新

### 支持的服务

#### Anthropic Claude
- **文档**: https://docs.anthropic.com/en/api/messages
- **维护方式**: 完全手动维护
- **规范位置**: `anthropic/official/openapi.yml`
- **自动同步**: ❌
- **更新频率**: 手动，跟随官方文档变更

#### 百度文心 (ERNIE)
- **文档**: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t
- **维护方式**: 基于配置生成
- **配置文件**: `scripts/configs/baidu-ernie.json`
- **生成脚本**: `scripts/sync/baidu-ernie.sh`
- **自动同步**: ⚠️  半自动（需更新配置）

#### 阿里通义 (Qwen)
- **文档**: https://help.aliyun.com/zh/dashscope/developer-reference/api-details
- **维护方式**: 基于配置生成
- **配置文件**: `scripts/configs/alibaba-qwen.json`
- **生成脚本**: `scripts/sync/alibaba-qwen.sh`
- **自动同步**: ⚠️  半自动（需更新配置）

#### 腾讯混元 (Hunyuan)
- **文档**: https://cloud.tencent.com/document/product/1729
- **维护方式**: 基于配置生成
- **配置文件**: `scripts/configs/tencent-hunyuan.json`（待创建）
- **自动同步**: ⚠️  半自动（需更新配置）

### 实现方式

#### 方式 1: 完全手动维护（推荐用于复杂 API）

直接编写和维护 OpenAPI 规范文件，参考官方文档：

```yaml
# anthropic/official/openapi.yml
openapi: 3.0.0
info:
  title: Anthropic API
  version: 2023-06-01

paths:
  /v1/messages:
    post:
      summary: Create a message
      requestBody:
        content:
          application/json:
            schema:
              # 手动编写完整的 schema
```

**优点**:
- 完全控制规范内容
- 可包含详细的描述和示例
- 适合复杂 API

**缺点**:
- 工作量大
- 需要定期手动更新

#### 方式 2: 基于配置生成（推荐用于简单 API）

创建 JSON 配置文件，描述 API 端点和参数：

```json
{
  "provider": "baidu-ernie",
  "protocol": "baidu",
  "baseUrl": "https://aip.baidubce.com",
  "endpoints": [
    {
      "path": "/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions",
      "method": "POST",
      "summary": "创建对话补全",
      "requestBody": { ... },
      "responses": { ... }
    }
  ]
}
```

然后运行生成脚本：

```bash
node scripts/convert/docs-to-openapi.js scripts/configs/baidu-ernie.json
```

**优点**:
- 结构化配置，易于维护
- 可快速生成基础规范
- 适合简单、规范的 API

**缺点**:
- 生成的规范可能不够详细
- 仍需手动维护配置文件

#### 方式 3: 爬虫 + AI 辅助（实验性）

使用爬虫抓取 API 文档，结合 AI 模型提取信息：

```javascript
// 伪代码示例
const docs = await crawlAPIDocs('https://docs.example.com/api');
const endpoints = await extractWithAI(docs); // 使用 GPT/Claude 提取
const openapi = generateOpenAPI(endpoints);
```

**优点**:
- 减少手动工作
- 可定期自动更新

**缺点**:
- 准确性依赖 AI 和文档质量
- 需要人工审核
- 可能违反网站使用条款

**建议**: 目前仅用于辅助，不作为主要方式

---

## 目录结构

```
proxy-specs/
├── openai/
│   ├── official/           # Tier 1: 自动同步
│   │   ├── openapi.yml
│   │   └── metadata.json
│   └── azure/              # Tier 1: 自动同步
│       ├── openapi.json
│       └── metadata.json
│
├── google/
│   ├── gemini/             # Tier 2: 下载 + 转换
│   │   ├── discovery.json  # 原始格式
│   │   ├── openapi.yml     # 转换后
│   │   └── metadata.json
│   └── vertex/             # Tier 2: 下载 + 转换
│
├── cohere/
│   └── official/           # Tier 1: 自动同步
│
├── baidu/
│   └── ernie/              # Tier 3: 配置生成
│       ├── openapi.yml
│       └── metadata.json
│
├── alibaba/
│   └── qwen/               # Tier 3: 配置生成
│
├── anthropic/
│   └── official/           # Tier 3: 手动维护
│
└── scripts/
    ├── sync/               # 各层级的同步脚本
    ├── convert/            # 格式转换工具
    └── configs/            # Tier 3 配置文件
```

---

## 元数据标准

每个规范都包含 `metadata.json`，标明其层级和维护方式：

### Tier 1 示例
```json
{
  "protocol": "openai",
  "provider": "official",
  "displayName": "OpenAI Official",
  "specFormat": "openapi-3.1",
  "source": "https://...",
  "autoSync": true,          // ✅ 自动同步
  "tier": 1
}
```

### Tier 2 示例
```json
{
  "protocol": "google",
  "provider": "gemini",
  "specFormat": "google-discovery",
  "convertedFormat": "openapi-3.0",  // 转换后格式
  "autoSync": true,                  // ✅ 可自动转换
  "tier": 2
}
```

### Tier 3 示例
```json
{
  "protocol": "baidu",
  "provider": "ernie",
  "specFormat": "openapi-3.0",
  "source": "manual-from-docs",       // 手动维护
  "autoSync": false,                  // ❌ 需要人工更新
  "tier": 3,
  "note": "基于配置生成，需定期对照官方文档更新"
}
```

---

## GitHub Actions 同步策略

```yaml
name: Sync Specs Daily

on:
  schedule:
    - cron: '0 0 * * *'  # 每天同步

jobs:
  sync:
    steps:
      # Tier 1 + Tier 2: 自动同步
      - name: Sync auto-sync specs
        run: bash scripts/sync-all.sh

      # Tier 3: 仅生成（不推送）
      - name: Generate Tier 3 specs
        run: |
          bash scripts/sync/baidu-ernie.sh
          bash scripts/sync/alibaba-qwen.sh

      # 提交变更（仅 Tier 1/2）
      - name: Commit if changed
        run: |
          if git diff --quiet openai/ google/ cohere/; then
            echo "No Tier 1/2 changes"
          else
            git commit -m "chore: auto-sync Tier 1/2 specs"
            git push
          fi
```

---

## 使用建议

### 集成到项目

```bash
# 方式 1: Git Submodule
git submodule add https://github.com/your-org/proxy-specs.git vendor-specs

# 方式 2: NPM
npm install proxy-specs

# 方式 3: 直接下载
curl -L https://github.com/your-org/proxy-specs/archive/v1.0.0.tar.gz | tar xz
```

### 选择合适的规范

```go
// Tier 1: 优先使用，质量最高
spec := loadSpec("vendor-specs/openai/official/openapi.yml")

// Tier 2: 可用，但注意转换可能有小问题
spec := loadSpec("vendor-specs/google/gemini/openapi.yml")

// Tier 3: 谨慎使用，可能不完整或过时
spec := loadSpec("vendor-specs/baidu/ernie/openapi.yml")
// 建议: 对照官方文档验证关键 API
```

### 贡献指南

- **Tier 1**: 提 issue 报告同步问题
- **Tier 2**: 提 PR 改进转换脚本
- **Tier 3**: 提 PR 更新配置文件或手动维护的规范

---

## 未来计划

1. **Tier 2 扩展**
   - 实现 AWS Bedrock Botocore 转换
   - 支持更多 Discovery 格式 API

2. **Tier 3 改进**
   - 开发更智能的文档爬虫
   - AI 辅助规范生成
   - 自动变更检测（对比文档版本）

3. **质量保证**
   - 添加规范验证测试
   - 对比实际 API 响应
   - 集成 Compliance Testing Framework

4. **社区贡献**
   - 接受社区提交的新规范
   - 建立规范审核流程
   - 提供规范质量评分
