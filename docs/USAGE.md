# ai-vendor-specs Usage Guide

**Languages**: English · [简体中文](./USAGE.zh-CN.md)

> A curated library of upstream AI API specifications. This guide targets **consumers** — any project that wants to read upstream specs directly: gateways / proxies, SDK generators, doc sites, contract testing, IDE assistants, AI agent tool registries, etc.

## Installation methods

### Method A: npm (recommended)

```bash
npm install @aihubmix/ai-vendor-specs
```

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');
const openai = loadSpec('avs://openai/official');
```

### Method B: pip (Python)

```bash
pip install ai-vendor-specs
```

```python
import ai_vendor_specs as avs
manifest = avs.load_manifest()
spec_path = avs.load_spec_path('openai', 'official')
```

Overlay composition is JavaScript-only in v0.1.x; the Python package returns raw paths.

### Method C: git submodule

Useful for CI that can't pull packages, or to pin to a specific commit:

```bash
git submodule add https://github.com/AIhubmix/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs
```

The resolver auto-detects sibling `./ai-vendor-specs/`. Or set it explicitly:

```bash
AVS_ROOT=./ai-vendor-specs node your-script.js
```

### Method D: `file:` dependency (sibling development)

```jsonc
// consumer/package.json
{
  "dependencies": {
    "@aihubmix/ai-vendor-specs": "file:../ai-vendor-specs"
  }
}
```

```bash
npm install   # creates node_modules/@aihubmix/ai-vendor-specs as a symlink
```

Changes to ai-vendor-specs take effect immediately (symlink, no reinstall).

### Method E: Plain HTTP, no runtime

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN (recommended for production, supports version pinning)
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@v0.1.0/upstream/openai/official/openapi.yml

# manifest entry
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@v0.1.0/manifest.json
```

### Once installed: unified `loadSpec` API

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');

const openaiSpec  = loadSpec('avs://openai/official');
const bedrockSpec = loadSpec('avs://anthropic/bedrock');  // overlay + base auto-composed

const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

## avs:// scheme

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

### Examples

| URI | Resolves to |
|---|---|
| `avs://openai/official` | `upstream/openai/official/openapi.yml` |
| `avs://openai/official#/components/schemas/CreateChatCompletionRequest` | That schema inside the spec |
| `avs://anthropic/bedrock` | overlay + base composed into a full spec |
| `avs://openai/xai` | overlay + openai/official composed |
| `avs://gemini/official` | `upstream/gemini/official/discovery.json` (Discovery format) |
| `avs://vertex/official` | `upstream/vertex/official/discovery.json` |

Resolver lookup order:

1. `AVS_ROOT` environment variable
2. The resolver's own location (works regardless of install mode)
3. `cwd/node_modules/@aihubmix/ai-vendor-specs` (npm install)
4. `cwd/ai-vendor-specs` (git submodule)

## Available upstreams

| URI | Format | Auto-sync |
|---|---|---|
| `avs://openai/official` | OpenAPI 3.1 (YAML) | ✅ Stainless |
| `avs://openai/azure` | OpenAPI 3.0 (JSON) | ✅ Azure REST API Specs |
| `avs://openai/azure-preview` | OpenAPI 3.1 (JSON) | ✅ Azure REST API Specs preview |
| `avs://openai/deepseek` | overlay | manual delta declaration |
| `avs://openai/groq` | overlay | manual delta declaration |
| `avs://openai/together` | overlay | manual delta declaration |
| `avs://openai/xai` | overlay | manual delta declaration |
| `avs://anthropic/official` | OpenAPI 3.1 | ✅ via SDK `.stats.yml` → Stainless GCS |
| `avs://anthropic/bedrock` | overlay | manual delta declaration |
| `avs://cohere/official` | OpenAPI 3.1 (YAML) | ✅ cohere-developer-experience |
| `avs://gemini/official` | Google Discovery JSON | ✅ Google Discovery API |
| `avs://vertex/official` | Google Discovery JSON | ✅ discovery-artifact-manager |

Full source details: [SOURCES.md](./SOURCES.md).

## Common scenarios

### Scenario 1: Gateway / proxy spec composition

Use ai-vendor-specs as a dependency to compose your gateway's outward-facing spec:

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');

// Load the base skeleton
const openaiSpec = loadSpec('avs://openai/official');

// Load an overlay-derived spec
const bedrockSpec = loadSpec('avs://anthropic/bedrock');

// In your own overlay, $ref into the upstream:
//   add:
//     cache_control:
//       $ref: "avs://anthropic/official#/components/schemas/CacheControlEphemeral"
// Inline it at build time
```

### Scenario 2: SDK / type generation

Generate TypeScript types / Python typed-dicts / Go structs directly from upstream specs:

```bash
# Use openapi-typescript
npx openapi-typescript \
  node_modules/@aihubmix/ai-vendor-specs/upstream/openai/official/openapi.yml \
  -o src/types/openai.d.ts
```

Types stay current — every daily upstream sync re-flows the spec.

### Scenario 3: Contract testing

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
// ['id', 'object', 'created', 'model', 'choices']

required.forEach(field => {
  expect(actualResponse[field]).not.toBeUndefined();
});
```

Useful for testing what the upstream actually promises. If you're testing your own gateway / proxy's responses, test against your gateway's own spec — not the upstream's.

### Scenario 4: Discovery → OpenAPI conversion (optional)

Gemini and Vertex use Google Discovery format. If downstreams want to feed them into an OpenAPI toolchain, use [gnostic](https://github.com/google/gnostic):

```bash
gnostic upstream/gemini/official/discovery.json \
  --openapi-out=upstream/gemini/official/openapi.yml
```

ai-vendor-specs stores only the original format; conversion is a consumer choice.

### Scenario 5: Doc site showing upstream truth

```js
const fs = require('fs');
const path = require('path');
const specsRoot = require.resolve('@aihubmix/ai-vendor-specs/package.json').replace('/package.json', '');
const spec = fs.readFileSync(
  path.join(specsRoot, 'upstream/openai/official/openapi.yml'),
  'utf8'
);
// Render with Redoc / Swagger UI
```

Or copy `upstream/` into your CI's static asset folder:

```bash
cp -r node_modules/@aihubmix/ai-vendor-specs/upstream ./public/specs/
# Then Redoc with spec-url=/specs/openai/official/openapi.yml
```

### Scenario 6: AI agent tool registry

Agent frameworks (LangChain / function-calling / MCP servers) need tool descriptions as model context. Use upstream OpenAPI as the tool metadata source:

```js
const spec = loadSpec('avs://openai/official');
const tools = Object.entries(spec.paths).flatMap(([path, ops]) =>
  Object.entries(ops).map(([method, op]) => ({
    name: op.operationId,
    description: op.summary,
    parameters: op.requestBody?.content?.['application/json']?.schema,
  }))
);
```

## Adding a new upstream

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-new-vendor).

## Related docs

- [README](../README.md) — project overview
- [ARCHITECTURE](./ARCHITECTURE.md) — design, kinds, metadata schema, overlay syntax
- [SOURCES](./SOURCES.md) — per-upstream sync details
- [CONTRIBUTING](../CONTRIBUTING.md) — adding vendors, dev workflow, drift, webhook

## License

MIT
