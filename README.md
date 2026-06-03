# ai-vendor-specs

> Curated official OpenAPI / Discovery specifications for major AI providers — daily upstream sync with drift detection.

**Languages**: English · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md)

**🌐 Browse the specs**: [aihubmix.github.io/ai-vendor-specs](https://aihubmix.github.io/ai-vendor-specs/) — every upstream rendered with Redoc, with protocol filter tabs and search.

`ai-vendor-specs` collects the source-of-truth API specifications published by major AI providers (OpenAI, Anthropic, Cohere, Google, Microsoft, plus OpenAI-compatible providers) and exposes them as one consistent dataset for downstream tools: SDK generators, gateways, doc sites, contract testing, IDE intelligence, and AI agent tool registries.

For variants without a machine-readable spec (e.g. Claude on AWS Bedrock, or OpenAI-compatible providers like Groq), differences are declared in compact overlay files that compose against a base spec at resolve time. The repository itself never stores derived artifacts — every byte traces back to an officially published upstream.

---

## Coverage

| Protocol | Provider | Kind | Upstream source |
|---|---|---|---|
| openai | official | spec | [openai/openai-openapi](https://github.com/openai/openai-openapi) (Stainless) |
| openai | azure | spec | [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable) · pinned `2024-10-21` |
| openai | azure-preview | spec | [Azure/azure-rest-api-specs preview](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview) · pinned `2025-04-01-preview` |
| openai | deepseek | overlay | [api-docs.deepseek.com](https://api-docs.deepseek.com/) |
| openai | groq | overlay | [console.groq.com/docs](https://console.groq.com/docs/api-reference) |
| openai | together | overlay | [docs.together.ai](https://docs.together.ai/reference/chat-completions) |
| openai | xai | overlay | [docs.x.ai](https://docs.x.ai/docs/api-reference) |
| anthropic | official | spec | [anthropics/anthropic-sdk-python `.stats.yml`](https://github.com/anthropics/anthropic-sdk-python/blob/main/.stats.yml) → Stainless |
| anthropic | bedrock | overlay | [AWS Bedrock InvokeModel docs](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |
| cohere | official | spec | [cohere-ai/cohere-developer-experience](https://github.com/cohere-ai/cohere-developer-experience) |
| gemini | official | spec | [Google AI Discovery](https://ai.google.dev/api/rest) (`generativelanguage.googleapis.com`) |
| vertex | official | spec | [Google Cloud Discovery](https://cloud.google.com/vertex-ai/docs/reference/rest) (`aiplatform.googleapis.com`) |
| openai | cerebras | spec | [cerebras-cloud-sdk-python `.stats.yml`](https://github.com/Cerebras/cerebras-cloud-sdk-python/blob/main/.stats.yml) → Stainless |
| openai | deepinfra | spec | [api.deepinfra.com/openapi.json](https://api.deepinfra.com/openapi.json) |
| openai | siliconflow | spec | [docs.siliconflow.cn](https://docs.siliconflow.cn/cn/api-reference/openapi.yaml) |
| openai | moonshot | spec | [platform.moonshot.cn/docs/openapi.json](https://platform.moonshot.cn/docs/openapi.json) |
| zhipu | official | spec | [docs.z.ai/openapi.json](https://docs.z.ai/openapi.json) (Z.AI / Zhipu GLM) |
| mistral | official | spec | [mistralai/platform-docs-public](https://github.com/mistralai/platform-docs-public/blob/main/openapi.yaml) |
| perplexity | official | spec | [docs.perplexity.ai/openapi.json](https://docs.perplexity.ai/openapi.json) |
| ideogram | official | spec | [developer.ideogram.ai/openapi.yaml](https://developer.ideogram.ai/openapi.yaml) |
| jina | official | spec | [api.jina.ai/openapi.json](https://api.jina.ai/openapi.json) |
| flux | official | spec | [api.bfl.ai/openapi.json](https://api.bfl.ai/openapi.json) (Black Forest Labs) |
| openai | bytedance | overlay | [Volcengine Ark](https://www.volcengine.com/docs/82379) |
| openai | sophnet | overlay | [SophNet](https://www.sophnet.com/docs/component/API.html) |
| openai | baidu | overlay | [Baidu Qianfan](https://cloud.baidu.com/doc/qianfan/s/Hmh4suq26) |
| openai | chutes | overlay | [Chutes](https://chutes.ai/llms-full.txt) |
| openai | alibaba | overlay | [Alibaba DashScope / Qwen](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) |
| openai | yi | overlay | [01.AI](https://platform.lingyiwanwu.com/docs) |
| openai | stepfun | overlay | [StepFun](https://platform.stepfun.com/docs) |
| openai | nvidia | overlay | [NVIDIA NIM](https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html) |
| openai | minimax | overlay | [MiniMax](https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md) |
| openai | baichuan | overlay | [Baichuan](https://platform.baichuan-ai.com/docs/api) |
| openai | xiaomi | overlay | [Xiaomi MiMo](https://platform.xiaomimimo.com/docs/en-US/api/chat/openai-api) |
| openai | daocloud | overlay | [DaoCloud d.run](https://docs.daocloud.io/en/hydra/api-call/) |

Full upstream URLs, sync methods, and version pinning details: [`docs/SOURCES.md`](./docs/SOURCES.md).

---

## How it works

ai-vendor-specs is a thin data layer with one job: keep an audit-trailed, machine-readable copy of every upstream AI provider's API truth, and expose it through a single URI scheme.

```
┌─── 12+ upstream vendors ────────────────────────────────────────┐
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google /          │
│   xAI / DeepSeek / Groq / Together / AWS Bedrock                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ daily cron sync (machine-readable spec)
                             │ overlay declarations (no spec available)
                             ▼
┌─── ai-vendor-specs (this repo) ─────────────────────────────────┐
│                                                                  │
│   upstream/<protocol>/<provider>/                                │
│     openapi.{yml,json} | discovery.json     ← spec  (synced)     │
│     overlay.yml                              ← overlay (manual)  │
│                                                                  │
│   manifest.json   ← discovery index covering every entry         │
│   resolver lib    ← composes base + overlay into a full spec     │
│   drift detector  ← warns when upstream versions move            │
└────────────────────────────┬────────────────────────────────────┘
                             │ npm / PyPI / submodule / raw / CDN
                             ▼
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  SDK generators        Gateways / proxies     Doc sites
  Contract tests        AI agent tools         IDE assistants
```

### What this repo does

- ✅ Sync each upstream's machine-readable OpenAPI / Discovery spec daily, hash-tracked
- ✅ Declare deltas with overlay files when the upstream has no published spec (AWS Bedrock, OpenAI-compatible providers like xAI / DeepSeek / Groq / Together)
- ✅ Maintain a top-level `manifest.json` as a discovery entry for every consumer
- ✅ Detect upstream drift — version moves, stale overlays, broken fetches — before it bites consumers downstream

### What this repo does NOT do

- ❌ Generate derived artifacts (composed specs, SDKs, contract fixtures) — those are the consumer's choice
- ❌ Record consumer-specific or business fields — the data stays neutral upstream truth

Decision rule: **"Is this a thing the upstream actually publishes?"** Yes → belongs here. No → belongs in the consumer.

Architecture details (kinds, overlay syntax, metadata schema): [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Installation

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

The Python package ships the same upstream data and a small read-only API. Overlay composition is currently JavaScript-only; see [Python usage](#python) below.

### Direct download (no runtime needed)

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/upstream/openai/official/openapi.yml
```

---

## Usage

### Load any upstream spec

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

// Pure spec — direct file load
const openai = loadSpec('avs://openai/official');

// Overlay-kind entries auto-compose base + overlay
const bedrock = loadSpec('avs://anthropic/bedrock');
const xai     = loadSpec('avs://openai/xai');

// Drill down to a specific schema via JSON Pointer
const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

### Discover everything available

```js
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

for (const [key, entry] of Object.entries(manifest.upstream)) {
  console.log(key, entry.kind, entry.rawUrl);
}
```

Or fetch the manifest directly without any runtime:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

### Python

```python
import ai_vendor_specs as avs

# Catalog
manifest = avs.load_manifest()
for vendor in avs.list_vendors():
    print(vendor['key'], vendor['kind'])

# Single lookup
xai = avs.get_vendor('openai', 'xai')

# Raw spec file path (overlay-kind entries return the overlay.yml; compose
# via the JavaScript resolver or wait for the Python composer)
spec_path = avs.load_spec_path('openai', 'official')
```

---

## Use cases

### Compose a gateway / proxy spec
Load upstream skeletons, then apply your own overlay to produce the spec your gateway exposes.

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');
const base = loadSpec('avs://openai/official');
const final = applyOverlay(base, myGatewayOverlay);  // overlay = your auth, error envelope, etc.
```

### Generate SDK types
Drop the spec into any OpenAPI codegen — daily upstream syncs keep types current.

```bash
npx openapi-typescript node_modules/@aihubmix/ai-vendor-specs/upstream/openai/official/openapi.yml \
  -o src/types/openai.d.ts
```

### Contract-test against upstream truth
Assert that the response fields the upstream actually promises are present in what you observe.

```js
const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
required.forEach(f => expect(actual[f]).not.toBeUndefined());
```

(Test your own gateway against its own spec; use this only for "did the upstream change something on us".)

### Embed specs in a doc site
Read the raw files from `node_modules/` and feed Redoc, Swagger UI, or any OpenAPI renderer. This is exactly how the [official doc site](https://aihubmix.github.io/ai-vendor-specs/) is built.

### Convert Discovery → OpenAPI
Gemini / Vertex ship Google Discovery. If your toolchain wants OpenAPI, run [gnostic](https://github.com/google/gnostic):

```bash
gnostic upstream/gemini/official/discovery.json --openapi-out=gemini.yml
```

### AI agent tool registry
Iterate `paths`/`operations` to emit function-call schemas for LangChain, MCP, or any agent framework. The specs already include `operationId`, parameter schemas, and request body shapes that map 1:1 to tool descriptors.

---

## The `avs://` URI scheme

All references to upstream specs use one consistent URI scheme:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

| Example | Resolves to |
|---|---|
| `avs://openai/official` | The full OpenAI OpenAPI spec |
| `avs://anthropic/bedrock` | The composed Bedrock spec (base + overlay) |
| `avs://anthropic/official#/components/schemas/Message` | One schema in the Anthropic spec |
| `avs://gemini/official` | The Gemini Google Discovery document |

The resolver looks for the data root in this order:

1. The `AVS_ROOT` environment variable (explicit override)
2. The current working directory if it is the repo itself
3. `node_modules/@aihubmix/ai-vendor-specs/` (npm install)
4. A sibling `ai-vendor-specs/` directory (git submodule)

You can write overlays or consumer code without caring which deployment mode is in use.

---

## Documentation

| Document | Audience | Content |
|---|---|---|
| [Live doc site](https://aihubmix.github.io/ai-vendor-specs/) | Browsers | Redoc-rendered specs for every upstream, with protocol filter tabs |
| [Architecture](./docs/ARCHITECTURE.md) | Anyone | Design, kinds, metadata schema, overlay syntax |
| [Sources](./docs/SOURCES.md) | Auditors | Upstream URLs and sync methods, per-vendor details |
| [Contributing](./CONTRIBUTING.md) | Contributors | Adding new vendors, repo development, drift, webhook |

---

## License

MIT
