# proxy-specs 架构设计

## 定位

proxy-specs 是一个 **API 规范存储与同步库**，收集各主流 AI 协议的原始规范，作为下游工具（自动化测试、Playground）的权威标准来源。

项目本身不包含任何业务逻辑，只做两件事：**同步规范**、**存储规范**。

---

## 目录结构

协议优先的二级目录结构：`<协议>/<变体>/`

```
proxy-specs/
├── openai/
│   ├── official/           # OpenAI 官方规范
│   │   ├── openapi.yml
│   │   └── metadata.json
│   └── azure/              # Azure OpenAI（OpenAI 协议变体）
│       ├── openapi.json
│       └── metadata.json
│
├── anthropic/
│   ├── official/           # Anthropic Claude 直连（手动维护）
│   │   ├── openapi.yml
│   │   └── metadata.json
│   └── bedrock/            # Claude on AWS Bedrock（手动维护）
│       ├── openapi.yml
│       └── metadata.json
│
├── cohere/
│   └── official/           # Cohere 原生协议
│       ├── openapi.yml
│       └── metadata.json
│
├── gemini/
│   └── official/           # Google Gemini 原生协议（AI Studio）
│       ├── discovery.json  # Google Discovery 格式（原生规范）
│       └── metadata.json
│
├── vertex/
│   └── official/           # Google Vertex AI 原生协议
│       ├── discovery.json  # Google Discovery 格式（原生规范）
│       └── metadata.json
│
└── scripts/
    ├── sync/               # 同步脚本
    │   ├── openai-official.sh
    │   ├── openai-azure.sh
    │   ├── anthropic-bedrock.sh
    │   ├── cohere-official.sh
    │   ├── gemini-official.sh
    │   └── vertex-official.sh
    ├── convert/            # 格式转换工具（备用）
    │   └── discovery-to-openapi.js
    ├── sync-all.sh
    ├── validate-all.sh
    └── utils.sh
```

---

## 分层设计（Tier）

根据规范来源的自动化程度，分为三层：

```
┌────────────────────────────────────────────────────────────┐
│ Tier 1: 有完整 OpenAPI 规范，直接下载                       │
│ ✅ 完全自动同步                                             │
├────────────────────────────────────────────────────────────┤
│ • openai/official    (OpenAPI 3.1 YAML)                    │
│ • openai/azure       (OpenAPI 3.0 JSON)                    │
│ • cohere/official    (OpenAPI 3.0 YAML)                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Tier 2: Google Discovery 格式，自动下载                     │
│ ✅ 自动同步（Discovery JSON 即原生规范，无需转换）          │
├────────────────────────────────────────────────────────────┤
│ • gemini/official    (Google Discovery JSON)               │
│ • vertex/official    (Google Discovery JSON)               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Tier 3: 无机器可读规范，手动维护                            │
│ ❌ 需要人工更新                                             │
├────────────────────────────────────────────────────────────┤
│ • anthropic/official (基于官方文档手动编写)                │
│ • anthropic/bedrock  (基于 AWS 文档手动编写)               │
└────────────────────────────────────────────────────────────┘
```

---

## Tier 1：完整 OpenAPI 规范

### openai/official
- **规范来源**: Stainless（OpenAI 官方）
- **格式**: OpenAPI 3.1 (YAML)
- **同步脚本**: `scripts/sync/openai-official.sh`
- **URL**: `https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml`

### openai/azure
- **规范来源**: Azure REST API Specs 仓库
- **格式**: OpenAPI 3.0 (JSON)
- **同步脚本**: `scripts/sync/openai-azure.sh`
- **说明**: Request body 与 OpenAI 完全一致，仅 URL 结构和认证头不同，因此归入 openai/ 协议目录

### cohere/official
- **规范来源**: cohere-ai/cohere-typescript 仓库（Fern 生成）
- **格式**: OpenAPI 3.0 (YAML)
- **同步脚本**: `scripts/sync/cohere-official.sh`
- **说明**: Cohere 使用自身原生协议（`/v1/chat`），与 OpenAI 协议结构不同，独立目录

### 同步实现

```bash
# Tier 1 同步脚本模式
source "$(dirname "$0")/../utils.sh"

SPEC_URL="https://..."
PROTOCOL="openai"
PROVIDER="official"
OUTPUT_DIR="${PROTOCOL}/${PROVIDER}"

mkdir -p "$OUTPUT_DIR"
download_spec "$SPEC_URL" "$OUTPUT_DIR/openapi.yml"
create_metadata "$PROTOCOL" "$PROVIDER" "OpenAI Official" \
    "openapi-3.1" "$SPEC_URL" "$OUTPUT_DIR/openapi.yml" true
```

---

## Tier 2：Google Discovery 格式

Google 使用自有的 Discovery 格式描述 API，Discovery JSON 即原生规范，直接存储，无需转换为 OpenAPI。

### gemini/official
- **规范来源**: `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta`
- **格式**: Google Discovery JSON
- **同步脚本**: `scripts/sync/gemini-official.sh`
- **网络要求**: 需能访问 `generativelanguage.googleapis.com`
- **说明**: Gemini 原生 API，endpoint 为 `/{version}/models/{model}:generateContent`，与 OpenAI 协议有根本性差异

### vertex/official
- **规范来源**: `https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries/aiplatform.v1.json`（GitHub 镜像，fallback 到 `aiplatform.googleapis.com`）
- **格式**: Google Discovery JSON
- **同步脚本**: `scripts/sync/vertex-official.sh`

---

## Tier 3：手动维护规范

### anthropic/official
- **文档来源**: https://docs.anthropic.com/en/api/messages
- **格式**: OpenAPI 3.0 (YAML)，手动编写
- **autoSync**: `false`
- **更新方式**: 参照官方文档变更，人工修改 `anthropic/official/openapi.yml`

### anthropic/bedrock
- **文档来源**: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- **格式**: OpenAPI 3.0 (YAML)，手动编写
- **autoSync**: `false`
- **与 anthropic/official 的区别**:
  - 服务器: `https://bedrock-runtime.{region}.amazonaws.com`
  - Endpoint: `/model/{modelId}/invoke`（非 `/v1/messages`）
  - 认证: AWS SigV4（非 `x-api-key` 头）
  - 请求体需额外包含 `anthropic_version: "bedrock-2023-05-31"` 字段
  - 通过 AWS SDK 调用，SDK 自动处理签名和区域路由

---

## metadata.json 规范

每个协议目录下必须包含 `metadata.json`：

```json
{
  "protocol": "openai",
  "provider": "official",
  "displayName": "OpenAI Official",
  "version": "2026-02-23",
  "specFormat": "openapi-3.1",
  "source": "https://app.stainless.com/...",
  "lastSynced": "2026-02-23T13:39:24Z",
  "hash": "sha256:3db95073...",
  "autoSync": true
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `protocol` | 协议名称，与顶级目录名一致 |
| `provider` | 变体名称，与二级目录名一致 |
| `specFormat` | 原始规范格式（`openapi-3.0`, `openapi-3.1`, `google-discovery`） |
| `hash` | 规范文件的 sha256，用于检测变更 |
| `autoSync` | 是否支持自动同步 |

---

## 同步流程

```bash
bash scripts/sync-all.sh
```

执行顺序（显式，避免依赖字母排序）：

1. `openai-official.sh`
2. `openai-azure.sh`
3. `anthropic-official.sh`（如存在）
4. `cohere-official.sh`
5. `gemini-official.sh`
6. `vertex-official.sh`

---

## 验证

```bash
bash scripts/validate-all.sh
```

检查每个协议目录：
- `openapi.yml` 或 `openapi.json` 文件存在
- `metadata.json` 文件存在且格式正确

---

## 下游消费方与 One API 关系

### proxy-specs 不是 one-api 的运行时依赖

one-api 的适配器层是硬编码的 Go 代码，不从本仓库动态加载规范。规范描述的是"API 长什么样"，适配器做的是"怎么在两种格式之间转换"——后者无法从前者自动推导。

one-api 适配器按转换复杂度分为两类：

**A 类（仅 URL + 认证头不同）**
- Azure OpenAI：URL 改为 `/openai/deployments/{model}/...`，认证改为 `api-key` 头，请求体原样传递

**C 类（完整协议转换）**
- Gemini：`messages[]→contents[]`，角色映射（`assistant→model`），endpoint 完全不同，约 76 处转换
- Anthropic：system message 提取为独立字段，token 参数名不同
- Cohere：`messages[]→message+chat_history[]`，`top_p→p`，`assistant→CHATBOT`

这也是协议目录设计的依据：Azure 请求体与 OpenAI 完全相同，归入 `openai/azure/`；Gemini/Cohere 结构性不同，各自独立协议目录。

### proxy-specs 的实际作用

```
proxy-specs (规范库)
       │
       ├── openai/official/openapi.yml ──► 自动化测试项目
       │                                     契约测试：验证 one-api 响应符合 OpenAI 标准
       │                                     spec 变更 → hash 更新 → CI 感知 → 人工 review
       │
       └── openai/official/openapi.yml ──► Playground 项目
                                             Schema 驱动参数表单，无需硬编码参数列表
                                             新参数 → spec 更新 → 构建时自动生成新控件
                                                  │
                                                  ▼
                                             one-api（chat 接口统一入口）
```
