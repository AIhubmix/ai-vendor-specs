# AI 协议规范来源

本文档记录 proxy-specs 中所有规范的官方来源地址和同步方法。

## 同步状态概览

| 协议 | 变体 | Tier | 来源格式 | 同步方式 | 官方地址 |
|------|------|------|---------|---------|---------|
| openai | official | 1 | OpenAPI 3.1 | 自动 | [Stainless](https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml) |
| openai | azure | 1 | OpenAPI 3.0 | 自动 | [Azure REST API Specs](https://github.com/Azure/azure-rest-api-specs) |
| cohere | official | 1 | OpenAPI 3.0 | 自动 | [cohere-typescript](https://github.com/cohere-ai/cohere-typescript) |
| gemini | official | 2 | Discovery | 自动 | [Google AI Discovery](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta) |
| vertex | official | 2 | Discovery | 自动 | [Google Cloud Discovery](https://aiplatform.googleapis.com/$discovery/rest?version=v1) |
| anthropic | official | 3 | 手动维护 | 手动 | [API 文档](https://docs.anthropic.com/en/api/messages) |
| anthropic | bedrock | 3 | 手动维护 | 手动 | [AWS Bedrock 文档](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |

---

## Tier 1: 完整 OpenAPI 规范

### openai/official

**来源**: OpenAI 官方，由 Stainless 托管

```bash
# 同步命令
curl -o openai/official/openapi.yml \
  "https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml"
```

**特点**:
- ✅ OpenAPI 3.1 格式
- ✅ 包含完整的端点、参数定义、示例
- ✅ 每日自动更新
- ✅ 质量极高

**GitHub 仓库**: https://github.com/openai/openai-openapi

**相关文档**: https://platform.openai.com/docs/api-reference

---

### openai/azure

**来源**: Azure REST API Specs 仓库

```bash
# 同步命令
curl -o openai/azure/openapi.json \
  "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-10-21/inference.json"
```

**特点**:
- ✅ OpenAPI 3.0 格式
- ✅ 微软官方维护
- ✅ Request body 与 OpenAI 完全相同
- ⚠️ URL 结构和认证方式不同

**关键差异**:
```diff
OpenAI:
- URL: https://api.openai.com/v1/chat/completions
- 认证: Authorization: Bearer {api_key}
- 模型: "model": "gpt-4"

Azure OpenAI:
+ URL: https://{resource}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-10-21
+ 认证: api-key: {api_key}
+ 模型: URL 中包含 deployment-id，请求体不需要 model 字段
```

**GitHub 仓库**: https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI

**相关文档**: https://learn.microsoft.com/en-us/azure/ai-services/openai/reference

---

### cohere/official

**来源**: Cohere TypeScript SDK 仓库（Fern 生成）

```bash
# 同步命令（示例，实际地址可能不同）
curl -o cohere/official/openapi.yml \
  "https://raw.githubusercontent.com/cohere-ai/cohere-typescript/main/openapi.yml"
```

**特点**:
- ✅ OpenAPI 3.0 格式
- ✅ 官方维护
- ✅ 包含 Chat、Embed、Rerank 等端点
- ✅ 使用自身原生协议（非 OpenAI 兼容）

**GitHub 仓库**: https://github.com/cohere-ai/cohere-typescript

**相关文档**: https://docs.cohere.com/reference/about

---

## Tier 2: Discovery 格式规范

### gemini/official

**来源**: Google AI Platform Discovery API

```bash
# 同步命令
curl -o gemini/official/discovery.json \
  "https://generativelanguage.googleapis.com/\$discovery/rest?version=v1beta"
```

**特点**:
- ✅ Google Discovery 格式（原生规范）
- ✅ 自动生成，实时更新
- ✅ Google 官方维护
- ⚠️ 国内访问需要代理

**主要端点**:
- `POST /v1beta/models/{model}:generateContent` - 生成内容
- `POST /v1beta/models/{model}:streamGenerateContent` - 流式生成
- `POST /v1beta/models/{model}:countTokens` - 计算 token 数

**关键差异（与 OpenAI）**:
```diff
OpenAI:
{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}

Gemini:
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Hello"}]
    }
  ],
  "generationConfig": {
    "temperature": 0.9,
    "maxOutputTokens": 2048
  }
}
```

**API 文档**: https://ai.google.dev/api/rest

---

### vertex/official

**来源**: Google Cloud Vertex AI Discovery API

```bash
# 同步命令
curl -o vertex/official/discovery.json \
  "https://aiplatform.googleapis.com/\$discovery/rest?version=v1"

# 备用来源（GitHub 镜像）
curl -o vertex/official/discovery.json \
  "https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries/aiplatform.v1.json"
```

**特点**:
- ✅ Google Discovery 格式
- ✅ 与 Gemini 类似，但有 Google Cloud 特性
- ✅ 支持更多企业功能
- ⚠️ 需要 Google Cloud 认证

**关键差异（与 Gemini）**:
```diff
Gemini (AI Studio):
- URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
- 认证: API Key

Vertex AI:
+ URL: https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
+ 认证: Google Cloud OAuth 2.0
```

**API 文档**: https://cloud.google.com/vertex-ai/docs/reference/rest

---

## Tier 3: 手动维护规范

### anthropic/official

**来源**: Anthropic 官方 API 文档（无机器可读规范）

**参考文档**: https://docs.anthropic.com/en/api/messages

**维护方式**: 手动编写 OpenAPI 3.0 规范

**特点**:
- ❌ 无官方 OpenAPI 规范文件
- ✅ 有详细的 API 参考文档
- ✅ API 设计清晰
- ⚠️ 需要人工维护

**主要端点**:
- `POST /v1/messages` - 对话（类似 OpenAI Chat Completions）

**关键差异（与 OpenAI）**:
```diff
OpenAI:
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}]
}

Claude:
{
  "model": "claude-3-opus-20240229",
  "messages": [{"role": "user", "content": "Hello"}],
+ "max_tokens": 1024  // 必需参数！OpenAI 中为可选
}
```

**更新策略**: 当 Anthropic 发布 API 变更公告时，人工对照文档更新 `anthropic/official/openapi.yml`

---

### anthropic/bedrock

**来源**: AWS Bedrock API 文档

**参考文档**: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html

**维护方式**: 手动编写 OpenAPI 3.0 规范

**特点**:
- ❌ 无 OpenAPI 规范（AWS 使用 Botocore 格式）
- ✅ 有详细的 AWS API 文档
- ⚠️ 需要人工维护

**主要操作**:
- `InvokeModel` - 调用模型
- `InvokeModelWithResponseStream` - 流式调用

**关键差异（与 anthropic/official）**:
```diff
Anthropic 直连:
- URL: https://api.anthropic.com/v1/messages
- 认证: x-api-key: {api_key}
- 版本: anthropic-version: 2023-06-01

AWS Bedrock:
+ URL: https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke
+ 认证: AWS SigV4 签名
+ 请求体额外包含: "anthropic_version": "bedrock-2023-05-31"
+ 通过 AWS SDK 调用
```

**Botocore 服务定义**: https://github.com/boto/botocore/blob/develop/botocore/data/bedrock-runtime/2023-09-30/service-2.json

**更新策略**: 当 AWS 发布 Bedrock API 变更时，人工对照文档更新 `anthropic/bedrock/openapi.yml`

---

## 其他潜在协议（未包含）

### AWS Bedrock (通用)

**Botocore 服务定义**:
```bash
curl -o aws-bedrock-botocore.json \
  "https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/bedrock-runtime/2023-09-30/service-2.json"
```

**特点**:
- ⚠️ Botocore JSON 格式（非 OpenAPI）
- ✅ AWS SDK 自动生成
- ⚠️ 每个模型的请求格式不同

**是否纳入 proxy-specs**: 不纳入，因为 Bedrock 本身不是协议，而是托管平台，每个模型（Claude、Llama 等）使用各自的协议

---

### Mistral AI

**来源**: Mistral AI SDK

```bash
git clone https://github.com/mistralai/client-python
# 查看 src/mistralai/openapi.json
```

**特点**:
- ✅ OpenAPI 3.0 格式
- ✅ 兼容 OpenAI API 格式
- ✅ SDK 中包含规范

**是否纳入 proxy-specs**: 可选，Mistral API 高度兼容 OpenAI，可直接使用 openai/official 规范

**API 文档**: https://docs.mistral.ai/api/

---

### 百度文心 (ERNIE)

**文档地址**: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有详细的 Web 文档
- ⚠️ API 格式接近 OpenAI，但有差异

**是否纳入 proxy-specs**: 已包含（Tier 3 配置生成），见 `scripts/configs/baidu-ernie.json`

---

### 阿里通义 (Qwen)

**文档地址**: https://help.aliyun.com/zh/dashscope/developer-reference/api-details

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有详细的 Web 文档
- ⚠️ 使用自定义格式

**是否纳入 proxy-specs**: 已包含（Tier 3 配置生成），见 `scripts/configs/alibaba-qwen.json`

---

### 腾讯混元

**文档地址**: https://cloud.tencent.com/document/product/1729

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有 API 文档
- ⚠️ 使用腾讯云 API 规范

**是否纳入 proxy-specs**: 待添加

---

## 规范格式转换

### Discovery → OpenAPI（可选）

如果需要将 Google Discovery 格式转换为 OpenAPI：

```bash
# 安装 gnostic
go install github.com/google/gnostic/cmd/gnostic@latest

# 转换
gnostic gemini/official/discovery.json \
  --openapi-out=gemini/official/openapi.yml
```

**注意**: proxy-specs 直接存储 Discovery JSON 作为原生规范，转换为 OpenAPI 是可选的。

### Botocore → OpenAPI（不支持）

AWS Botocore 格式转换为 OpenAPI 需要自定义脚本，proxy-specs 不提供此转换。

---

## 规范验证

验证下载的规范文件是否有效：

```bash
# 验证 OpenAPI 规范
npx @redocly/cli lint openai/official/openapi.yml

# 验证 JSON 格式
jq empty gemini/official/discovery.json
```

---

## 规范差异对比

对比两个规范的差异：

```bash
# 安装 openapi-diff
npm install -g openapi-diff

# 对比
openapi-diff openai/official/openapi.yml openai/azure/openapi.json
```

---

## 自动同步策略

### Tier 1（完全自动）

```yaml
# .github/workflows/sync-tier1.yml
name: Sync Tier 1 Specs
on:
  schedule:
    - cron: '0 0 * * *'  # 每日 UTC 00:00
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync OpenAI
        run: bash scripts/sync/openai-official.sh
      - name: Sync Azure OpenAI
        run: bash scripts/sync/openai-azure.sh
      - name: Sync Cohere
        run: bash scripts/sync/cohere-official.sh
      # ... 提交变更
```

### Tier 2（半自动）

```yaml
# .github/workflows/sync-tier2.yml
name: Sync Tier 2 Specs
on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync Gemini
        run: bash scripts/sync/gemini-official.sh
      - name: Sync Vertex AI
        run: bash scripts/sync/vertex-official.sh
      # ... 提交变更
```

### Tier 3（手动）

无自动同步。当厂商 API 变更时：
1. 查阅官方文档
2. 手动更新 `anthropic/official/openapi.yml` 或配置文件
3. 更新 `metadata.json` 中的 `lastSynced` 和 `hash`
4. 提交变更

---

## 相关文档

- [架构设计](./ARCHITECTURE.md) - Tier 分层说明
- [使用指南](./USAGE.md) - 如何加载规范

---

## 贡献规范来源

如果发现新的规范来源或更好的获取方式，欢迎提交 Issue 或 PR：

1. Fork proxy-specs 仓库
2. 更新 `docs/SOURCES.md`
3. 更新对应的同步脚本
4. 提交 Pull Request

**注意**: 只接受官方或权威来源的规范，不接受第三方重新编写的规范。
