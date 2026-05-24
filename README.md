# ai-vendor-specs

> Curated official OpenAPI / Discovery specifications for major AI providers — daily upstream sync with drift detection.

**Languages**: English · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md)

`ai-vendor-specs` collects the source-of-truth API specifications published by major AI providers (OpenAI, Anthropic, Cohere, Google, Microsoft, plus OpenAI-compatible providers) and exposes them as one consistent dataset for downstream tools: SDK generators, gateways, doc sites, contract testing, IDE intelligence, and AI agent tool registries.

For variants without a machine-readable spec (e.g. Claude on AWS Bedrock, or OpenAI-compatible providers like Groq), differences are declared in compact overlay files that compose against a base spec at resolve time. The repository itself never stores derived artifacts — every byte traces back to an officially published upstream.

---

## Coverage

| Protocol | Provider | Kind | Upstream source |
|---|---|---|---|
| openai | official | spec | Stainless |
| openai | azure | spec | Azure REST API Specs (stable 2024-10-21) |
| openai | azure-preview | spec | Azure REST API Specs (preview 2025-04-01-preview) |
| openai | deepseek | overlay | api-docs.deepseek.com |
| openai | groq | overlay | console.groq.com/docs |
| openai | together | overlay | docs.together.ai |
| openai | xai | overlay | docs.x.ai |
| anthropic | official | spec | Anthropic SDK `.stats.yml` → Stainless |
| anthropic | bedrock | overlay | AWS Bedrock docs |
| cohere | official | spec | cohere-developer-experience |
| gemini | official | spec | Google Discovery (`generativelanguage.googleapis.com`) |
| vertex | official | spec | Google Discovery (`aiplatform.googleapis.com`) |

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
| [Architecture](./docs/ARCHITECTURE.md) | Anyone | Design, kinds, metadata schema, overlay syntax |
| [Usage Guide](./docs/USAGE.md) | Consumers | Consumption patterns, common scenarios |
| [Sources](./docs/SOURCES.md) | Auditors | Upstream URLs and sync methods, per-vendor details |
| [Contributing](./CONTRIBUTING.md) | Contributors | Adding new vendors, repo development, drift, webhook |

---

## License

MIT
