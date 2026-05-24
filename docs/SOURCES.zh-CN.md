# AI 协议规范来源

**语言**: [English](./SOURCES.md) · 简体中文

本文档记录 ai-vendor-specs 中所有规范的官方来源地址和同步方法。

## 同步状态概览

| 协议 | 变体 | Tier | 来源格式 | 同步方式 | 官方地址 |
|------|------|------|---------|---------|---------|
| openai | official | 1 | OpenAPI 3.1 | 自动 | [Stainless](https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml) |
| openai | azure | 1 | OpenAPI 3.0 | 自动(stable 2024-10-21) | [Azure REST API Specs](https://github.com/Azure/azure-rest-api-specs) |
| openai | azure-preview | 1 | OpenAPI 3.1 | 自动(preview,版本号钉死) | [Azure REST API Specs preview](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview) |
| openai | groq | 3 | overlay(无独立 spec) | 手动维护 overlay.yml | [Groq API docs](https://console.groq.com/docs/openai) |
| openai | together | 3 | overlay(无独立 spec) | 手动维护 overlay.yml | [Together AI docs](https://docs.together.ai/docs/openai-compatibility) |
| openai | deepseek | 3 | overlay(无独立 spec) | 手动维护 overlay.yml | [DeepSeek API docs](https://api-docs.deepseek.com/) |
| openai | xai | 3 | overlay(无独立 spec) | 手动维护 overlay.yml | [xAI docs](https://docs.x.ai/docs/api-reference) |
| cohere | official | 1 | OpenAPI 3.1 | 自动 | [cohere-developer-experience](https://github.com/cohere-ai/cohere-developer-experience) |
| gemini | official | 2 | Discovery | 自动 | [Google AI Discovery](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta) |
| vertex | official | 2 | Discovery | 自动 | [Google Cloud Discovery](https://aiplatform.googleapis.com/$discovery/rest?version=v1) |
| anthropic | official | 1 | OpenAPI 3.1 | 自动 | [anthropic-sdk-python `.stats.yml`](https://github.com/anthropics/anthropic-sdk-python/blob/main/.stats.yml) → Stainless GCS spec |
| anthropic | bedrock | 3 | overlay(无独立 spec) | 手动维护 overlay.yml | [AWS Bedrock 文档](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |

---

## Tier 1: 完整 OpenAPI 规范

### openai/official

**来源**: OpenAI 官方，由 Stainless 托管

```bash
# 同步命令
curl -o upstream/openai/official/openapi.yml \
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
curl -o upstream/openai/azure/openapi.json \
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

### openai/azure-preview

**来源**: Azure REST API Specs 仓库 preview 子目录

```bash
# 同步命令(版本号在 scripts/sync/openai-azure-preview.sh 中钉死)
AZURE_API_VERSION="2025-04-01-preview"
curl -o upstream/openai/azure-preview/openapi.json \
  "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview/${AZURE_API_VERSION}/inference.json"
```

**特点**:
- ✅ OpenAPI 3.1 格式
- ✅ 比 stable 多 30 个端点(Assistants / Threads / Vector Stores / Responses / Realtime / TTS / 图像编辑)
- ✅ chat/completions 多 8 个字段(`reasoning_effort` / `prediction` / `audio` / `modalities` / `stream_options` / `metadata` / `store` / `user_security_context`)
- ⚠️ preview 字段在下个 preview 版本可能改 / 删,**不可作长期契约**
- ⚠️ 版本号钉死在 `2025-04-01-preview`,Azure 出新 preview 时需人手动 bump

**何时用 azure-preview 而非 azure**:
- 接 o1 / o3 系列(需 `reasoning_effort`)
- 接 gpt-4o-audio(需 `audio` / `modalities`)
- 需要流式计费(`stream_options.include_usage`)
- 暴露 Assistants / Threads / Vector Stores

**升级 preview 版本号**:
1. `gh api repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview | jq -r '.[].name'` 查可用版本
2. 改 `scripts/sync/openai-azure-preview.sh` 中的 `AZURE_API_VERSION` 变量
3. 跑 `npm run sync` 拉新版
4. 跑 `npm run manifest` 刷新

---

### cohere/official

**来源**: Cohere Developer Experience 仓库根目录

```bash
# 同步命令
curl -o upstream/cohere/official/openapi.yml \
  "https://raw.githubusercontent.com/cohere-ai/cohere-developer-experience/main/cohere-openapi.yaml"
```

**特点**:
- ✅ OpenAPI 3.1 格式
- ✅ 官方维护(Cohere 内部 monorepo 同步到此仓库)
- ✅ 包含 Chat、Embed、Rerank 等端点
- ✅ 使用自身原生协议(非 OpenAI 兼容)

**GitHub 仓库**: https://github.com/cohere-ai/cohere-developer-experience

> 历史变化:此 spec 之前位于 `cohere-ai/cohere-typescript` 的 `fern/openapi/openapi.yml`,已于 2026 年迁移至当前位置。旧 URL 自 2026-02 起返回 404。

**相关文档**: https://docs.cohere.com/reference/about

---

## Tier 2: Discovery 格式规范

### gemini/official

**来源**: Google AI Platform Discovery API

```bash
# 同步命令
curl -o upstream/gemini/official/discovery.json \
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

**来源**: GitHub 镜像优先,Google Cloud Discovery API 作 fallback

```bash
# 主来源:GitHub 镜像(googleapis 官方维护,无需 GCP 认证)
GITHUB_URL="https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries/aiplatform.v1.json"

# 备用:Google Cloud Discovery API(实时,但需要能访问 aiplatform.googleapis.com,
# 国内 CI 经常拉不到)
FALLBACK_URL='https://aiplatform.googleapis.com/$discovery/rest?version=v1'

# scripts/sync/vertex-official.sh 的逻辑:
# 1. 先试 GitHub URL,成功就用它
# 2. GitHub 拉失败才回落到 Google API
curl -fsSL -o upstream/vertex/official/discovery.json "$GITHUB_URL" \
  || curl -fsSL -o upstream/vertex/official/discovery.json "$FALLBACK_URL"
```

**特点**:
- ✅ Google Discovery 格式
- ✅ 与 Gemini 类似,但有 Google Cloud 特性
- ✅ 支持更多企业功能
- ⚠️ Google API 实时入口需要 GCP OAuth / 网络可达,GitHub 镜像不需要 —— 所以主备顺序是反着的

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

## Tier 1(特殊): SDK `.stats.yml` 间接定位

### anthropic/official

**来源**: Anthropic SDK 仓库 `.stats.yml` → Stainless 托管的 OpenAPI YAML

```bash
# 同步命令（实际由 scripts/sync/anthropic-official.sh 执行）
# 1. 从 .stats.yml 解析当前 spec URL
SPEC_URL=$(curl -sL https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/.stats.yml \
  | sed -n 's/^openapi_spec_url:[[:space:]]*\(.*\)$/\1/p' | xargs)
# 2. 下载 spec
curl -o upstream/anthropic/official/openapi.yml "$SPEC_URL"
```

**特点**:
- ✅ OpenAPI 3.1 格式（与 OpenAI/Azure 同级）
- ✅ Anthropic 官方维护（其 Python/TypeScript SDK 由此 spec 自动生成）
- ✅ 覆盖 `tools`、`tool_choice`、`thinking`、`cache_control`、`anthropic-beta` 等完整字段
- ⚠️ 不在固定 URL 发布——spec URL 含内容哈希，每次更新时由 stainless-bot 更新 `.stats.yml`，因此同步脚本必须先解析 `.stats.yml`

**主要端点**:
- `POST /v1/messages` - 创建消息（对话）
- `POST /v1/messages/count_tokens` - token 计数
- `POST /v1/messages/batches` - 批量消息

**关键差异（与 OpenAI）**:
```diff
OpenAI:
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}]
}

Claude:
{
  "model": "claude-sonnet-4-20250514",
  "messages": [{"role": "user", "content": "Hello"}],
+ "max_tokens": 1024  // 必需参数！OpenAI 中为可选
}
```

**更新策略**: 完全自动。Stainless bot 重新生成 SDK 时会更新 `.stats.yml`；下次 CI sync 即同步到最新 spec

**参考文档**: https://docs.anthropic.com/en/api/messages

---

## Tier 3: overlay 派生

### anthropic/bedrock(overlay)

**维护方式**: overlay。本目录**不存独立 spec 文件**,只有 `overlay.yml` 声明与 `anthropic/official` 的差异。消费方 build 时 resolver(`scripts/overlay/apply.js`)读 base + overlay 合成完整 spec。

**目录内容**:
- `upstream/anthropic/bedrock/overlay.yml` — 差异声明
- `upstream/anthropic/bedrock/metadata.json` — `kind: overlay`, `base: avs://anthropic/official`

**关键差异(与 anthropic/official)**:
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

**为什么不存独立 spec**:
- AWS 没有 OpenAPI 文件,只发 Botocore JSON,且 Botocore 把请求体当不透明 blob,不描述 Claude 字段
- Anthropic 不为 Bedrock 单独发 spec
- envelope 差异极小,与其复制粘贴 anthropic/official 的内容人工维护,不如声明差异 + 自动 resolve

**参考文档**:
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- https://docs.anthropic.com/en/api/claude-on-amazon-bedrock

**Botocore 服务定义(仅作背景参考)**: https://github.com/boto/botocore/blob/develop/botocore/data/bedrock-runtime/2023-09-30/service-2.json

**更新策略**: 当 AWS / Anthropic 发布 Bedrock API 变更时,人工修改 `overlay.yml`(只改差异部分,base 字段自动跟 anthropic/official 走)

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

**是否纳入 ai-vendor-specs**: 不纳入，因为 Bedrock 本身不是协议，而是托管平台，每个模型（Claude、Llama 等）使用各自的协议

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

**是否纳入 ai-vendor-specs**: 可选，Mistral API 高度兼容 OpenAI，可直接使用 openai/official 规范

**API 文档**: https://docs.mistral.ai/api/

---

### 百度文心 (ERNIE)

**文档地址**: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有详细的 Web 文档
- ⚠️ API 格式接近 OpenAI，但有差异

**是否纳入 ai-vendor-specs**: 待添加。可走 `kind: manual` 路线,人工对照文档写 `upstream/baidu/ernie/openapi.yml`(参考 [docs/ARCHITECTURE.md](./ARCHITECTURE.zh-CN.md) 的 manual 条目说明)。

---

### 阿里通义 (Qwen)

**文档地址**: https://help.aliyun.com/zh/dashscope/developer-reference/api-details

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有详细的 Web 文档
- ⚠️ 使用自定义格式

**是否纳入 ai-vendor-specs**: 待添加。可走 `kind: manual` 路线,人工对照文档写 `upstream/alibaba/qwen/openapi.yml`。

---

### 腾讯混元

**文档地址**: https://cloud.tencent.com/document/product/1729

**特点**:
- ❌ 无 OpenAPI 规范
- ✅ 有 API 文档
- ⚠️ 使用腾讯云 API 规范

**是否纳入 ai-vendor-specs**: 待添加

---

## 规范格式转换

### Discovery → OpenAPI（可选）

如果需要将 Google Discovery 格式转换为 OpenAPI：

```bash
# 安装 gnostic
go install github.com/google/gnostic/cmd/gnostic@latest

# 转换
gnostic upstream/gemini/official/discovery.json \
  --openapi-out=upstream/gemini/official/openapi.yml
```

**注意**: ai-vendor-specs 直接存储 Discovery JSON 作为原生规范，转换为 OpenAPI 是可选的。

### Botocore → OpenAPI（不支持）

AWS Botocore 格式转换为 OpenAPI 需要自定义脚本，ai-vendor-specs 不提供此转换。

---

## 规范验证

验证下载的规范文件是否有效：

```bash
# 验证 OpenAPI 规范
npx @redocly/cli lint upstream/openai/official/openapi.yml

# 验证 JSON 格式
jq empty upstream/gemini/official/discovery.json
```

---

## 规范差异对比

对比两个规范的差异：

```bash
# 安装 openapi-diff
npm install -g openapi-diff

# 对比
openapi-diff upstream/openai/official/openapi.yml upstream/openai/azure/openapi.json
```

---

## 自动同步策略

### 单一工作流统一拉取

实际配置在 [`.github/workflows/sync-daily.yml`](../.github/workflows/sync-daily.yml),一个 cron 工作流跑全部 sync 脚本:

```yaml
name: Sync Specs Daily
on:
  schedule:
    - cron: '30 11 * * *'   # 每天 UTC 11:30(北京时间 19:30)
  workflow_dispatch:        # 也支持手动触发

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync all specs
        run: bash scripts/sync-all.sh        # 内含全部 7 个 sync/*.sh + manifest 重建
      - name: Validate
        run: bash scripts/validate-all.sh
      - name: Auto-commit if changed
        run: |
          git diff --quiet || (
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add . && git commit -m "chore: auto-sync specs $(date +%Y-%m-%d)" && git push
          )
      # 还自动打 git tag v1.YYYYMMDD.0 作快照
```

`scripts/sync-all.sh` 内部依次跑(顺序固定):

| # | 脚本 | 拉取方式 | 备注 |
|---|---|---|---|
| 1 | `openai-official.sh` | 单步 curl Stainless 公共 URL | — |
| 2 | `openai-azure.sh` | 单步 curl GitHub raw | 钉死 `2024-10-21` stable |
| 3 | `openai-azure-preview.sh` | 单步 curl GitHub raw | 钉死 `2025-04-01-preview`,Azure 出新 preview 时需人手动 bump 脚本里的 `AZURE_API_VERSION` |
| 4 | `anthropic-official.sh` | **两步**:先 curl SDK 仓库 `.stats.yml`,sed 解析出当前 spec URL,再 curl 那 URL | spec URL 含内容 hash,每次 Stainless 重新生成时变化 |
| 5 | `cohere-official.sh` | 单步 curl GitHub raw | 注意 URL 历史变更过(从 `cohere-typescript` 迁到 `cohere-developer-experience`) |
| 6 | `gemini-official.sh` | 单步 curl Google `$discovery/rest` 实时端点 | 国内 CI 可能拉不到,需要代理 |
| 7 | `vertex-official.sh` | **带 fallback**:GitHub 镜像主,失败回落 Google `$discovery/rest` | 因 Google API 端点需要可达性 |

跑完后:
- `download_spec` 已加 `curl --fail`,任何 4xx/5xx **不会**把 error body 写入 spec 文件(2026-02 cohere 那次三个月写 `404: Not Found` 的事故已修)
- 自动 `npm run manifest` 重建顶层 `manifest.json`
- 自动 `validate-all.sh` 校验目录结构

### overlay 类型如何"跟"上游

`upstream/anthropic/bedrock/overlay.yml` **不被 sync 拉取**(它就是手维护的),但它通过 `base: avs://anthropic/official` 引用 official。当 anthropic-official 自动同步刷新后,**消费方下次 build 时**,resolver 会自动用最新 base 加上 overlay 合成新 bedrock spec。

换句话说:**ai-vendor-specs 这一层无需为 bedrock 做任何同步动作,bedrock 的"更新"是消费方触发的派生行为**。

### Drift 检测(scripts/check-drift.js)

由于版本钉死(azure stable / preview)和 overlay 手维护(bedrock)这两个机制**对上游变化不敏感**,sync-all 末尾会跑一遍 [`scripts/check-drift.js`](../scripts/check-drift.js),输出 `.drift-report.md` 并自动 commit 进 git。

四类检测:

| 类别 | 触发条件 | 处置 |
|---|---|---|
| **版本追踪** | 上游 GitHub 目录里出现比钉死版本更新的版本 | warn — 修改 sync 脚本里的 `AZURE_API_VERSION`,跑 `npm run sync` |
| **overlay 新鲜度** | overlay 类条目 `lastReviewed` > 90 天 | warn — 核对 `lastReviewedDocs` 里列的官方文档,若改了则更新 overlay,无变化则更新 lastReviewed |
| **overlay resolve 健康度** | 跑 `loadSpec('avs://X/Y')` 失败 | error — 上游 base 可能改了破坏 overlay 引用的字段 / path / schema |
| **spec 文件完整性** | spec 文件以 `404:` / `<html>` / `error:` 开头(`download_spec` 退化时会发生) | error — 上游 URL 可能失效,检查 sync 脚本 |

报告示例:

```markdown
# Drift Report

_Generated 2026-XX-XX..._

## ⚠️ WARN (1)

- **`openai/azure-preview`**(版本追踪)— 上游有更新版本 `2025-06-01-preview`,当前钉死 `2025-04-01-preview`
    - 处置:若要升级:编辑 `scripts/sync/openai-azure-preview.sh` 改 `AZURE_API_VERSION` → `2025-06-01-preview`,跑 `npm run sync`
```

drift 不阻塞 sync,只报告。可以手动跑:

```bash
npm run drift
```

加新的版本钉死类条目时,**记得**到 `scripts/check-drift.js` 顶部的 `versionTrackers` 配置里加一条。

加新的 overlay 类条目时,**记得**:
- 在 metadata.json 加 `lastReviewed: "YYYY-MM-DD"` 字段
- 加 `lastReviewedDocs: [...]` 列出关联的官方文档 URL(给人 review 时核对用)

#### Drift 通知

`scripts/check-drift.js` 在检测到 warn/error 时自动调用 `scripts/notify.js`,把摘要 markdown 推送到 webhook。通道按 URL 自动识别(Slack / Discord / generic POST),完整说明见 [CONTRIBUTING.md](../CONTRIBUTING.md#webhook-notifications)。

CI 在 `.github/workflows/sync-daily.yml` 已挂好,从 GitHub Secrets 读取 `AVS_WEBHOOK_URL` 注入:

```yaml
- name: Check drift (with webhook notification on warn/error)
  env:
    AVS_WEBHOOK_URL: ${{ secrets.AVS_WEBHOOK_URL }}
    AVS_WEBHOOK_TYPE: ${{ secrets.AVS_WEBHOOK_TYPE }}
  run: npm run drift
```

未配置 `AVS_WEBHOOK_URL` 时静默 no-op,fork 用户零侵入。

### Tier 3(overlay / manual)

无自动同步。

**overlay 类型(如 `anthropic/bedrock`)**:当上游或其 base 变化时:
1. 修改 `upstream/<protocol>/<provider>/overlay.yml`,只改差异声明
2. 更新 `metadata.json` 的 `lastEdited`(不需要 `hash`,差异自动跟 base 走)
3. 跑 `npm run resolve avs://<protocol>/<provider>` 验证 resolve 结果合理
4. 提交变更

**manual 类型(暂无,如未来加入百度/阿里/腾讯)**:
1. 查阅官方文档,手工编写 `upstream/<protocol>/<provider>/openapi.yml`
2. 更新 `metadata.json` 的 `lastEdited` 和 `hash`
3. 提交变更

---

## 相关文档

- [架构设计](./ARCHITECTURE.zh-CN.md) - Tier 分层说明
- [使用指南](./USAGE.zh-CN.md) - 如何加载规范

---

## 贡献规范来源

如果发现新的规范来源或更好的获取方式，欢迎提交 Issue 或 PR：

1. Fork ai-vendor-specs 仓库
2. 更新 `docs/SOURCES.md`
3. 更新对应的同步脚本
4. 提交 Pull Request

**注意**: 只接受官方或权威来源的规范，不接受第三方重新编写的规范。
