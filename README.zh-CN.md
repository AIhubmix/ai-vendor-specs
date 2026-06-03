# ai-vendor-specs

> 主流 AI 厂商官方 OpenAPI / Discovery 规范的汇集库,每日自动同步上游 + 漂移检测。

**语言**: [English](./README.md) · 简体中文 · [日本語](./README.ja.md)

**🌐 在线浏览 spec**: [aihubmix.github.io/ai-vendor-specs](https://aihubmix.github.io/ai-vendor-specs/) —— 每个上游 spec 都用 Redoc 渲染,带 protocol 筛选 tab。

`ai-vendor-specs` 把各主流 AI 厂商(OpenAI、Anthropic、Cohere、Google、Microsoft,以及一众 OpenAI 兼容厂商)发布的官方 API 规范统一收纳到一处,以一致的数据结构供下游消费:SDK 生成器、网关、文档站、契约测试、IDE 智能提示、AI agent 工具注册表等。

对于没有机器可读 spec 的变体(如 AWS Bedrock 上的 Claude、Groq 等 OpenAI 兼容厂商),用紧凑的 overlay 文件声明差异,在 resolve 阶段合成完整 spec。仓库本身**不存储任何派生产物**,每一个字节都可追溯到上游官方来源。

---

## 当前覆盖

| 协议 | provider | 类型 | 上游来源 |
|---|---|---|---|
| openai | official | spec | [openai/openai-openapi](https://github.com/openai/openai-openapi)(Stainless) |
| openai | azure | spec | [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable) · 钉版 `2024-10-21` |
| openai | azure-preview | spec | [Azure/azure-rest-api-specs preview](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview) · 钉版 `2025-04-01-preview` |
| openai | deepseek | overlay | [api-docs.deepseek.com](https://api-docs.deepseek.com/) |
| openai | groq | overlay | [console.groq.com/docs](https://console.groq.com/docs/api-reference) |
| openai | together | overlay | [docs.together.ai](https://docs.together.ai/reference/chat-completions) |
| openai | xai | overlay | [docs.x.ai](https://docs.x.ai/docs/api-reference) |
| anthropic | official | spec | [anthropics/anthropic-sdk-python `.stats.yml`](https://github.com/anthropics/anthropic-sdk-python/blob/main/.stats.yml) → Stainless |
| anthropic | bedrock | overlay | [AWS Bedrock InvokeModel 文档](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |
| cohere | official | spec | [cohere-ai/cohere-developer-experience](https://github.com/cohere-ai/cohere-developer-experience) |
| gemini | official | spec | [Google AI Discovery](https://ai.google.dev/api/rest)(`generativelanguage.googleapis.com`) |
| vertex | official | spec | [Google Cloud Discovery](https://cloud.google.com/vertex-ai/docs/reference/rest)(`aiplatform.googleapis.com`) |
| openai | cerebras | spec | [cerebras-cloud-sdk-python `.stats.yml`](https://github.com/Cerebras/cerebras-cloud-sdk-python/blob/main/.stats.yml) → Stainless |
| openai | deepinfra | spec | [api.deepinfra.com/openapi.json](https://api.deepinfra.com/openapi.json) |
| openai | siliconflow | spec | [docs.siliconflow.cn](https://docs.siliconflow.cn/cn/api-reference/openapi.yaml)(硅基流动) |
| openai | moonshot | spec | [platform.moonshot.cn/docs/openapi.json](https://platform.moonshot.cn/docs/openapi.json)(月之暗面 Kimi) |
| zhipu | official | spec | [docs.z.ai/openapi.json](https://docs.z.ai/openapi.json)(Z.AI / 智谱 GLM) |
| mistral | official | spec | [mistralai/platform-docs-public](https://github.com/mistralai/platform-docs-public/blob/main/openapi.yaml) |
| perplexity | official | spec | [docs.perplexity.ai/openapi.json](https://docs.perplexity.ai/openapi.json) |
| ideogram | official | spec | [developer.ideogram.ai/openapi.yaml](https://developer.ideogram.ai/openapi.yaml) |
| jina | official | spec | [api.jina.ai/openapi.json](https://api.jina.ai/openapi.json) |
| flux | official | spec | [api.bfl.ai/openapi.json](https://api.bfl.ai/openapi.json)(Black Forest Labs) |
| openai | bytedance | overlay | [火山方舟 Ark](https://www.volcengine.com/docs/82379)(豆包) |
| openai | sophnet | overlay | [SophNet](https://www.sophnet.com/docs/component/API.html) |
| openai | baidu | overlay | [百度千帆](https://cloud.baidu.com/doc/qianfan/s/Hmh4suq26)(文心 ERNIE) |
| openai | chutes | overlay | [Chutes](https://chutes.ai/llms-full.txt) |
| openai | alibaba | overlay | [阿里云百炼 / 通义千问](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) |
| openai | yi | overlay | [零一万物 01.AI](https://platform.lingyiwanwu.com/docs) |
| openai | stepfun | overlay | [阶跃星辰 StepFun](https://platform.stepfun.com/docs) |
| openai | nvidia | overlay | [NVIDIA NIM](https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html) |
| openai | minimax | overlay | [MiniMax 海螺](https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md) |
| openai | baichuan | overlay | [百川智能](https://platform.baichuan-ai.com/docs/api) |
| openai | xiaomi | overlay | [小米 MiMo](https://platform.xiaomimimo.com/docs/en-US/api/chat/openai-api) |
| openai | daocloud | overlay | [DaoCloud d.run](https://docs.daocloud.io/en/hydra/api-call/) |

完整上游 URL、同步方式和版本钉死细节见 [`docs/SOURCES.md`](./docs/SOURCES.zh-CN.md)。

---

## 工作机制

ai-vendor-specs 是一层薄薄的数据层,职责单一:保存每个上游 AI 厂商 API 真相的机器可读拷贝(可审计、可追溯),用统一的 URI 协议对外暴露。

```
┌─── 12+ 个上游厂商 ────────────────────────────────────────────┐
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google /        │
│   xAI / DeepSeek / Groq / Together / AWS Bedrock               │
└────────────────────────────┬──────────────────────────────────┘
                             │ 每日 cron 同步(机器可读 spec)
                             │ overlay 文件声明差异(无 spec 的)
                             ▼
┌─── ai-vendor-specs(本仓库)────────────────────────────────────┐
│                                                                │
│   upstream/<protocol>/<provider>/                              │
│     openapi.{yml,json} | discovery.json     ← spec(自动同步)  │
│     overlay.yml                              ← overlay(手维护)│
│                                                                │
│   manifest.json   ← 所有条目的发现入口                          │
│   resolver lib    ← 把 base + overlay 合成完整 spec             │
│   drift detector  ← 上游版本变动 / overlay 过期 / 同步失败时报警│
└────────────────────────────┬──────────────────────────────────┘
                             │ npm / PyPI / submodule / raw / CDN
                             ▼
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  SDK 生成器              网关 / proxy           文档站
  契约测试                AI agent 工具          IDE 智能提示
```

### 这个仓库做什么

- ✅ 每日自动同步每个上游的机器可读 OpenAPI / Discovery 规范,hash 跟踪
- ✅ 对没有公开机器可读 spec 的上游(AWS Bedrock、OpenAI 兼容厂商:xAI / DeepSeek / Groq / Together 等),用 overlay 文件声明差异
- ✅ 维护顶层 `manifest.json` 作为所有消费方的发现入口
- ✅ 漂移检测——版本变动、overlay 过期、同步失败——在消费方踩坑前预警

### 这个仓库**不**做什么

- ❌ 生成派生产物(合成 spec、SDK、契约 fixture)——那是消费方自己的选择
- ❌ 记录消费方业务字段——数据保持中性的上游真相

判断口诀:**"这描述的是上游真实存在的东西吗?"** 是 → 放这里。否 → 放消费方。

架构细节(kind 分类、overlay 语法、metadata schema)见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.zh-CN.md)。

---

## 安装

### npm

```bash
npm install @aihubmix/ai-vendor-specs
```

### git submodule

```bash
git submodule add https://github.com/AIhubmix/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs
```

### pip

```bash
pip install ai-vendor-specs
```

Python 包共享同一份上游数据,提供只读 API。overlay 合成目前仅 JavaScript 版可用;详见下方 [Python 使用](#python-1)。

### 直接下载(无需运行时)

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/upstream/openai/official/openapi.yml
```

---

## 使用

### 加载任意上游 spec

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

// spec 类条目:直接读文件
const openai = loadSpec('avs://openai/official');

// overlay 类条目:自动合成 base + overlay
const bedrock = loadSpec('avs://anthropic/bedrock');
const xai     = loadSpec('avs://openai/xai');

// 通过 JSON Pointer 取具体 schema
const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

### 发现可用上游

```js
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

for (const [key, entry] of Object.entries(manifest.upstream)) {
  console.log(key, entry.kind, entry.rawUrl);
}
```

或不通过运行时直接拉:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

### Python

```python
import ai_vendor_specs as avs

# 厂商目录
manifest = avs.load_manifest()
for vendor in avs.list_vendors():
    print(vendor['key'], vendor['kind'])

# 单条查询
xai = avs.get_vendor('openai', 'xai')

# 原始 spec 文件路径(overlay 类条目返回 overlay.yml,
# 合成需要 JavaScript 版 resolver,Python 合成器在路线图)
spec_path = avs.load_spec_path('openai', 'official')
```

---

## 典型场景

### 1. 合成网关 / proxy 自家 spec
拉上游骨架,叠加自家 overlay 产出对外 spec。

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');
const base = loadSpec('avs://openai/official');
const final = applyOverlay(base, myGatewayOverlay);  // overlay = 自家认证、错误体等
```

### 2. SDK / 类型生成
丢给任意 OpenAPI codegen,每日同步保证类型不滞后。

```bash
npx openapi-typescript node_modules/@aihubmix/ai-vendor-specs/upstream/openai/official/openapi.yml \
  -o src/types/openai.d.ts
```

### 3. 契约测试(对照上游真相)
断言上游承诺的字段是否真的出现。

```js
const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
required.forEach(f => expect(actual[f]).not.toBeUndefined());
```

(测自家网关响应该用自家 spec;这里只检查"上游悄悄改了字段没"。)

### 4. 文档站展示上游
从 `node_modules/` 直接读原始文件喂给 Redoc / Swagger UI。本项目的 [doc site](https://aihubmix.github.io/ai-vendor-specs/) 就是这么搭的。

### 5. Discovery → OpenAPI 转换
Gemini / Vertex 走 Google Discovery。如果工具链只吃 OpenAPI,用 [gnostic](https://github.com/google/gnostic):

```bash
gnostic upstream/gemini/official/discovery.json --openapi-out=gemini.yml
```

### 6. AI agent 工具注册表
遍历 `paths`/`operations` 直接生成函数调用 schema,适配 LangChain / MCP 等 agent 框架。spec 自带 `operationId`、参数 schema、请求体形状,一一映射成工具描述符。

---

## `avs://` URI 协议

所有上游引用统一使用同一套 URI:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

| 示例 | 解析为 |
|---|---|
| `avs://openai/official` | OpenAI 整份 OpenAPI spec |
| `avs://anthropic/bedrock` | Bedrock 合成后的完整 spec(base + overlay) |
| `avs://anthropic/official#/components/schemas/Message` | Anthropic spec 里某个 schema |
| `avs://gemini/official` | Gemini 的 Google Discovery 文档 |

Resolver 按以下顺序定位数据根目录:

1. 环境变量 `AVS_ROOT`(显式覆盖)
2. 当前工作目录(在仓库自身内运行时)
3. `node_modules/@aihubmix/ai-vendor-specs/`(npm 安装)
4. 同级 `ai-vendor-specs/` 目录(git submodule)

写 overlay 或消费方代码时无需关心当前在哪一种部署模式下。

---

## 文档

| 文档 | 读者 | 内容 |
|---|---|---|
| [在线文档站](https://aihubmix.github.io/ai-vendor-specs/) | 浏览者 | 每个上游 spec 的 Redoc 视图,带 protocol 筛选 tab |
| [架构设计](./docs/ARCHITECTURE.zh-CN.md) | 所有人 | 设计、kind 分类、metadata schema、overlay 语法 |
| [上游来源](./docs/SOURCES.zh-CN.md) | 审计者 | 各厂商上游 URL 和同步方式 |
| [贡献指南](./CONTRIBUTING.md) | 贡献者 | 加新厂商、本地开发、drift、webhook |

---

## License

MIT
