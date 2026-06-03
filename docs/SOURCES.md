# Upstream Sources

**Languages**: English · [简体中文](./SOURCES.zh-CN.md)

This document records the official sources and sync method for every spec in ai-vendor-specs.

## Sync overview

| Protocol | Variant | Tier | Source format | Sync | Official |
|---|---|---|---|---|---|
| openai | official | 1 | OpenAPI 3.1 | auto | [Stainless](https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml) |
| openai | azure | 1 | OpenAPI 3.0 | auto (stable 2024-10-21) | [Azure REST API Specs](https://github.com/Azure/azure-rest-api-specs) |
| openai | azure-preview | 1 | OpenAPI 3.1 | auto (preview, pinned) | [Azure REST API Specs preview](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview) |
| openai | groq | 3 | overlay (no spec) | manual `overlay.yml` | [Groq API docs](https://console.groq.com/docs/openai) |
| openai | together | 3 | overlay (no spec) | manual `overlay.yml` | [Together AI docs](https://docs.together.ai/docs/openai-compatibility) |
| openai | deepseek | 3 | overlay (no spec) | manual `overlay.yml` | [DeepSeek API docs](https://api-docs.deepseek.com/) |
| openai | xai | 3 | overlay (no spec) | manual `overlay.yml` | [xAI docs](https://docs.x.ai/docs/api-reference) |
| cohere | official | 1 | OpenAPI 3.1 | auto | [cohere-developer-experience](https://github.com/cohere-ai/cohere-developer-experience) |
| gemini | official | 2 | Discovery | auto | [Google AI Discovery](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta) |
| vertex | official | 2 | Discovery | auto | [Google Cloud Discovery](https://aiplatform.googleapis.com/$discovery/rest?version=v1) |
| anthropic | official | 1 | OpenAPI 3.1 | auto | [anthropic-sdk-python `.stats.yml`](https://github.com/anthropics/anthropic-sdk-python/blob/main/.stats.yml) → Stainless GCS |
| anthropic | bedrock | 3 | overlay (no spec) | manual `overlay.yml` | [AWS Bedrock docs](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |
| openai | cerebras | 1 | OpenAPI 3.1 | auto (`.stats.yml`→Stainless) | [cerebras-cloud-sdk-python `.stats.yml`](https://github.com/Cerebras/cerebras-cloud-sdk-python/blob/main/.stats.yml) |
| openai | deepinfra | 1 | OpenAPI 3.1 | auto | [api.deepinfra.com/openapi.json](https://api.deepinfra.com/openapi.json) |
| openai | siliconflow | 1 | OpenAPI 3.0 | auto | [docs.siliconflow.cn openapi.yaml](https://docs.siliconflow.cn/cn/api-reference/openapi.yaml) |
| openai | moonshot | 1 | OpenAPI 3.1 | auto | [platform.moonshot.cn/docs/openapi.json](https://platform.moonshot.cn/docs/openapi.json) |
| zhipu | official | 2 | OpenAPI 3.0 | auto | [docs.z.ai/openapi.json](https://docs.z.ai/openapi.json) |
| mistral | official | 1 | OpenAPI 3.1 | auto | [mistralai/platform-docs-public openapi.yaml](https://github.com/mistralai/platform-docs-public/blob/main/openapi.yaml) |
| perplexity | official | 2 | OpenAPI 3.1 | auto | [docs.perplexity.ai/openapi.json](https://docs.perplexity.ai/openapi.json) |
| ideogram | official | 2 | OpenAPI 3.1 | auto | [developer.ideogram.ai/openapi.yaml](https://developer.ideogram.ai/openapi.yaml) |
| jina | official | 2 | OpenAPI 3.1 | auto | [api.jina.ai/openapi.json](https://api.jina.ai/openapi.json) |
| flux | official | 2 | OpenAPI 3.1 | auto | [api.bfl.ai/openapi.json](https://api.bfl.ai/openapi.json) |
| openai | bytedance | 3 | overlay (no spec) | manual `overlay.yml` | [Volcengine Ark docs](https://www.volcengine.com/docs/82379) |
| openai | sophnet | 3 | overlay (no spec) | manual `overlay.yml` | [SophNet API docs](https://www.sophnet.com/docs/component/API.html) |
| openai | baidu | 3 | overlay (no spec) | manual `overlay.yml` | [Baidu Qianfan docs](https://cloud.baidu.com/doc/qianfan/s/Hmh4suq26) |
| openai | chutes | 3 | overlay (no spec) | manual `overlay.yml` | [Chutes docs](https://chutes.ai/llms-full.txt) |
| openai | alibaba | 3 | overlay (no spec) | manual `overlay.yml` | [Alibaba DashScope OpenAI-compat](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) |
| openai | yi | 3 | overlay (no spec) | manual `overlay.yml` | [01.AI docs](https://platform.lingyiwanwu.com/docs) |
| openai | stepfun | 3 | overlay (no spec) | manual `overlay.yml` | [StepFun docs](https://platform.stepfun.com/docs) |
| openai | nvidia | 3 | overlay (no spec) | manual `overlay.yml` | [NVIDIA NIM LLM API](https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html) |
| openai | minimax | 3 | overlay (no spec) | manual `overlay.yml` | [MiniMax OpenAI API](https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md) |
| openai | baichuan | 3 | overlay (no spec) | manual `overlay.yml` | [Baichuan API docs](https://platform.baichuan-ai.com/docs/api) |
| openai | xiaomi | 3 | overlay (no spec) | manual `overlay.yml` | [Xiaomi MiMo OpenAI API](https://platform.xiaomimimo.com/docs/en-US/api/chat/openai-api) |
| openai | daocloud | 3 | overlay (no spec) | manual `overlay.yml` | [DaoCloud d.run API](https://docs.daocloud.io/en/hydra/api-call/) |

> 2026-06 expansion: 10 specs + 12 overlays added in registry order. Authority tier (A production-host / B official-docs / C official-repo·SDK), source-legitimacy evidence (cert owner), and agent-readability are tracked per vendor in [SOURCES.zh-CN.md](./SOURCES.zh-CN.md#2026-06-扩充). AWS Bedrock general surface stays manual·pending — official machine-readable model is Smithy (`aws/api-models-aws`), not OpenAPI.

---

## Tier 1: full OpenAPI specs

### openai/official

**Source**: OpenAI, hosted by Stainless.

```bash
curl -o upstream/openai/official/openapi.yml \
  "https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml"
```

- OpenAPI 3.1 (YAML)
- Daily auto-update; complete endpoints and parameters
- GitHub mirror: https://github.com/openai/openai-openapi
- Reference docs: https://platform.openai.com/docs/api-reference

---

### openai/azure

**Source**: Azure REST API Specs repo, stable channel.

```bash
curl -o upstream/openai/azure/openapi.json \
  "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable/2024-10-21/inference.json"
```

- OpenAPI 3.0 (JSON), maintained by Microsoft
- Request body is identical to OpenAI; URL and auth differ

**Key differences:**
```diff
OpenAI:
- URL:  https://api.openai.com/v1/chat/completions
- Auth: Authorization: Bearer {api_key}
- Model field: "model": "gpt-4"

Azure OpenAI:
+ URL:  https://{resource}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2024-10-21
+ Auth: api-key: {api_key}
+ Model is in the URL (deployment-id), not the body
```

Reference docs: https://learn.microsoft.com/en-us/azure/ai-services/openai/reference

---

### openai/azure-preview

**Source**: Azure REST API Specs preview subdirectory, version pinned in the sync script.

```bash
AZURE_API_VERSION="2025-04-01-preview"
curl -o upstream/openai/azure-preview/openapi.json \
  "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview/${AZURE_API_VERSION}/inference.json"
```

- OpenAPI 3.1 (JSON); adds 30 endpoints over stable (Assistants / Threads / Vector Stores / Responses / Realtime / TTS / Image editing)
- chat/completions includes 8 fields not in stable (`reasoning_effort` / `prediction` / `audio` / `modalities` / `stream_options` / `metadata` / `store` / `user_security_context`)
- ⚠️ Preview fields may change or be removed in the next preview — **not a long-term contract**
- ⚠️ Version pinned to `2025-04-01-preview`; bump manually when Azure ships a new preview

**When to use azure-preview over azure:**
- o1 / o3 series (requires `reasoning_effort`)
- gpt-4o-audio (requires `audio` / `modalities`)
- Streaming usage accounting (`stream_options.include_usage`)
- Assistants / Threads / Vector Stores

**Bumping the preview version:**
1. `gh api repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview | jq -r '.[].name'` — list available versions
2. Edit `AZURE_API_VERSION` in `scripts/sync/openai-azure-preview.sh`
3. `npm run sync` to fetch
4. `npm run manifest` to refresh

---

### cohere/official

**Source**: Cohere developer experience repo, root directory.

```bash
curl -o upstream/cohere/official/openapi.yml \
  "https://raw.githubusercontent.com/cohere-ai/cohere-developer-experience/main/cohere-openapi.yaml"
```

- OpenAPI 3.1 (YAML), officially maintained
- Covers Chat, Embed, Rerank, etc.
- Uses Cohere's native protocol (not OpenAI-compatible)

> History: this spec was previously at `cohere-ai/cohere-typescript`'s `fern/openapi/openapi.yml`, migrated to the current location in 2026. The old URL returns 404 since 2026-02.

Reference docs: https://docs.cohere.com/reference/about

---

## Tier 2: Discovery format

### gemini/official

**Source**: Google AI Platform Discovery API.

```bash
curl -o upstream/gemini/official/discovery.json \
  "https://generativelanguage.googleapis.com/\$discovery/rest?version=v1beta"
```

- Google Discovery format (native), auto-generated and live
- ⚠️ Access from China may require a proxy

**Main endpoints:**
- `POST /v1beta/models/{model}:generateContent`
- `POST /v1beta/models/{model}:streamGenerateContent`
- `POST /v1beta/models/{model}:countTokens`

**Key differences from OpenAI:**
```diff
OpenAI:
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello"}]
}

Gemini:
{
  "contents": [
    { "role": "user", "parts": [{"text": "Hello"}] }
  ],
  "generationConfig": { "temperature": 0.9, "maxOutputTokens": 2048 }
}
```

Reference docs: https://ai.google.dev/api/rest

---

### vertex/official

**Source**: GitHub mirror primary, Google Cloud Discovery API as fallback.

```bash
# Primary: GitHub mirror (no GCP auth required)
GITHUB_URL="https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries/aiplatform.v1.json"

# Fallback: Google Cloud Discovery (live, but needs reachability to aiplatform.googleapis.com)
FALLBACK_URL='https://aiplatform.googleapis.com/$discovery/rest?version=v1'

curl -fsSL -o upstream/vertex/official/discovery.json "$GITHUB_URL" \
  || curl -fsSL -o upstream/vertex/official/discovery.json "$FALLBACK_URL"
```

- Google Discovery format
- Similar to Gemini but with Google Cloud features (project / location / publisher in path)
- ⚠️ Google API endpoint requires OAuth or network reachability; GitHub mirror does not — that's why mirror is primary

**Key differences from Gemini:**
```diff
Gemini (AI Studio):
- URL:  https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
- Auth: API key

Vertex AI:
+ URL:  https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent
+ Auth: Google Cloud OAuth 2.0
```

Reference docs: https://cloud.google.com/vertex-ai/docs/reference/rest

---

## Tier 1 (special): SDK `.stats.yml` indirect lookup

### anthropic/official

**Source**: Anthropic SDK repo's `.stats.yml` → spec URL on Stainless GCS.

```bash
# Two-step: parse SDK metadata, then fetch the spec
SPEC_URL=$(curl -sL https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/.stats.yml \
  | sed -n 's/^openapi_spec_url:[[:space:]]*\(.*\)$/\1/p' | xargs)
curl -o upstream/anthropic/official/openapi.yml "$SPEC_URL"
```

- OpenAPI 3.1 (peer of OpenAI / Azure)
- Officially maintained by Anthropic (Python and TypeScript SDKs are auto-generated from this spec)
- Covers `tools`, `tool_choice`, `thinking`, `cache_control`, `anthropic-beta`, etc.
- ⚠️ Not at a fixed URL — the spec URL contains a content hash. `stainless-bot` updates `.stats.yml` on each spec change, so the sync script must parse it first.

**Main endpoints:**
- `POST /v1/messages`
- `POST /v1/messages/count_tokens`
- `POST /v1/messages/batches`

**Key differences from OpenAI:**
```diff
OpenAI:
{ "model": "gpt-4", "messages": [...] }

Claude:
{
  "model": "claude-sonnet-4-20250514",
  "messages": [...],
+ "max_tokens": 1024   // REQUIRED in Claude; optional in OpenAI
}
```

**Update strategy**: fully automatic. Stainless bot updates `.stats.yml` when it regenerates the SDK; the next CI sync picks up the latest spec.

Reference docs: https://docs.anthropic.com/en/api/messages

---

## Tier 3: overlay-derived

### anthropic/bedrock (overlay)

**Maintenance**: overlay-only. No standalone spec stored — `overlay.yml` declares the deltas against `anthropic/official`. At consume time the resolver (`scripts/overlay/apply.js`) composes base + overlay into a full spec.

**Files:**
- `upstream/anthropic/bedrock/overlay.yml` — delta declarations
- `upstream/anthropic/bedrock/metadata.json` — `kind: overlay`, `base: avs://anthropic/official`

**Key differences from anthropic/official:**
```diff
Anthropic direct:
- URL:  https://api.anthropic.com/v1/messages
- Auth: x-api-key: {api_key}
- Version: anthropic-version: 2023-06-01

AWS Bedrock:
+ URL:  https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke
+ Auth: AWS SigV4 signature
+ Body adds: "anthropic_version": "bedrock-2023-05-31"
+ Invoked via AWS SDK
```

**Why no standalone spec:**
- AWS doesn't publish an OpenAPI file — only Botocore JSON, which treats the request body as an opaque blob and doesn't describe Claude fields
- Anthropic doesn't publish a separate spec for Bedrock
- Envelope differences are minimal, so declaring deltas + auto-resolving is cleaner than maintaining a duplicate

Reference docs:
- https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- https://docs.anthropic.com/en/api/claude-on-amazon-bedrock

Botocore service definition (background only): https://github.com/boto/botocore/blob/develop/botocore/data/bedrock-runtime/2023-09-30/service-2.json

**Update strategy**: when AWS / Anthropic ship a Bedrock API change, edit `overlay.yml` (only the deltas — the base auto-tracks `anthropic/official`).

---

### openai/{deepseek, groq, together, xai} (overlay)

OpenAI-compatible providers that don't publish a machine-readable spec. Each overlay declares the URL + extension fields and inherits everything else from `openai/official`.

| Provider | Server URL | Notable extensions (handled via doc citation, not spec-level) |
|---|---|---|
| deepseek | `https://api.deepseek.com/v1` | R1 response includes `reasoning_content` |
| groq | `https://api.groq.com/openai/v1` | Subset of OpenAI; no logprobs, no image input |
| together | `https://api.together.xyz/v1` | Compatible subset |
| xai | `https://api.x.ai/v1` | `deferred`, `search_parameters`, `citations`, `reasoning_content`, `output_files`, `usage.cost_in_usd_ticks` |

For overlay schemas see the `overlay.yml` in each directory. The top comment cites the official doc URLs that were reviewed.

---

## Other potential upstreams (not yet included)

### AWS Bedrock (general)

Botocore service definitions describe the Bedrock control plane but not individual model payloads:

```bash
curl -o aws-bedrock-botocore.json \
  "https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/bedrock-runtime/2023-09-30/service-2.json"
```

**Status**: not included. Bedrock isn't itself a protocol; it's a hosting platform where each model (Claude / Llama / etc.) uses its own protocol.

### Mistral AI

Spec ships inside the Python SDK:

```bash
git clone https://github.com/mistralai/client-python
# see src/mistralai/openapi.json
```

**Status**: optional. Mistral is largely OpenAI-compatible — the `openai/official` spec covers most use cases.

API docs: https://docs.mistral.ai/api/

### Baidu ERNIE (文心)

Docs: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t. No OpenAPI spec; web docs only. Format is OpenAI-adjacent with deltas.

**Status**: pending. Path: `kind: manual` — write `upstream/baidu/ernie/openapi.yml` from official docs.

### Alibaba Qwen (通义)

Docs: https://help.aliyun.com/zh/dashscope/developer-reference/api-details. No OpenAPI spec; uses a custom format.

**Status**: pending. Path: `kind: manual`.

### Tencent Hunyuan (混元)

Docs: https://cloud.tencent.com/document/product/1729. No OpenAPI spec; uses Tencent Cloud's API style.

**Status**: pending.

---

## Spec format conversion

### Discovery → OpenAPI (optional)

For toolchains that don't speak Discovery:

```bash
go install github.com/google/gnostic/cmd/gnostic@latest

gnostic upstream/gemini/official/discovery.json \
  --openapi-out=upstream/gemini/official/openapi.yml
```

ai-vendor-specs stores the native format; conversion is a consumer choice.

### Botocore → OpenAPI (not supported)

Would need a custom converter. Not provided.

---

## Validation

```bash
# OpenAPI lint
npx @redocly/cli lint upstream/openai/official/openapi.yml

# JSON syntax
jq empty upstream/gemini/official/discovery.json
```

---

## Spec diffing

```bash
npm install -g openapi-diff
openapi-diff upstream/openai/official/openapi.yml upstream/openai/azure/openapi.json
```

---

## Automatic sync strategy

### Single daily workflow

The actual config is in [`.github/workflows/sync-daily.yml`](../.github/workflows/sync-daily.yml) — one cron workflow runs every sync script:

```yaml
name: Sync Specs Daily
on:
  schedule:
    - cron: '30 11 * * *'   # UTC 11:30 (Beijing 19:30)
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: bash scripts/sync-all.sh
      - run: bash scripts/validate-all.sh
      - run: npm run manifest
      - run: npm run drift
        env:
          AVS_WEBHOOK_URL: ${{ secrets.AVS_WEBHOOK_URL }}
      # Auto-commit if anything changed, then push
```

`scripts/sync-all.sh` runs each sync script in order:

| # | Script | Method | Notes |
|---|---|---|---|
| 1 | `openai-official.sh` | Single curl from Stainless public URL | — |
| 2 | `openai-azure.sh` | Single curl from GitHub raw | Pinned to `2024-10-21` stable |
| 3 | `openai-azure-preview.sh` | Single curl from GitHub raw | Pinned to `2025-04-01-preview`; bump manually |
| 4 | `anthropic-official.sh` | **Two-step**: parse `.stats.yml`, then fetch the hashed spec URL | Spec URL changes per regeneration |
| 5 | `cohere-official.sh` | Single curl from GitHub raw | URL moved historically (cohere-typescript → cohere-developer-experience) |
| 6 | `gemini-official.sh` | Single curl from Google's `$discovery/rest` live endpoint | May fail from China CI without a proxy |
| 7 | `vertex-official.sh` | GitHub mirror primary, Google API fallback | Mirror is more reliable |

After all syncs:
- `download_spec` uses `curl --fail` — any 4xx/5xx avoids writing an error body into the spec file (fixed the 2026-02 cohere incident)
- `manifest.json` is regenerated
- Directory structure is validated

### How overlay entries "track" upstream

`upstream/anthropic/bedrock/overlay.yml` **is not pulled by sync** (it's hand-maintained), but it references `base: avs://anthropic/official`. When `anthropic/official` auto-syncs and refreshes, **the next consumer build** produces a fresh composed Bedrock spec automatically.

In other words: ai-vendor-specs does nothing for Bedrock on its end — the "update" of Bedrock is a derivation triggered by consumers.

### Drift detection

Because version pinning (Azure stable / preview) and overlay maintenance (Bedrock) are **insensitive to upstream changes by design**, `sync-all` finishes by running [`scripts/check-drift.js`](../scripts/check-drift.js). It writes `.drift-report.md` and (optionally) posts to a webhook.

Four classes of checks:

| Class | Triggers when | Action |
|---|---|---|
| **Version tracking** | An upstream GitHub directory shows a newer version than the pinned one | warn — bump `AZURE_API_VERSION` in the sync script, then `npm run sync` |
| **Overlay freshness** | `lastReviewed` is older than 90 days | warn — re-read the docs at `lastReviewedDocs`; update overlay or refresh `lastReviewed` |
| **Overlay resolve health** | `loadSpec('avs://X/Y')` fails | error — base changed in a way incompatible with the overlay |
| **Spec file sanity** | A spec file starts with `404:`, `<html>`, etc. | error — sync silently failed; check the script |

Sample report:

```markdown
# Drift Report

_Generated 2026-XX-XX..._

## ⚠️ WARN (1)

- **`openai/azure-preview`** (version tracking) — upstream has `2025-06-01-preview`, pinned at `2025-04-01-preview`
    - Action: edit `scripts/sync/openai-azure-preview.sh`, set `AZURE_API_VERSION` → `2025-06-01-preview`, run `npm run sync`
```

Drift never blocks sync — it always exits 0 and writes a report. Run manually:

```bash
npm run drift
```

When adding a new version-pinned entry, **register it** in the `versionTrackers` config at the top of `scripts/check-drift.js`.

When adding a new overlay entry, **set** `lastReviewed: "YYYY-MM-DD"` and `lastReviewedDocs: [...]` in `metadata.json`.

#### Drift notifications

`scripts/check-drift.js` calls `scripts/notify.js` when there are warns or errors. The notifier auto-detects channel type from the URL (Slack / Discord / generic POST). Configuration is via the `AVS_WEBHOOK_URL` GitHub secret — see [CONTRIBUTING.md](../CONTRIBUTING.md#webhook-notifications) for details.

Without a configured webhook, drift output is silent — fork-safe by default.

### Tier 3 (overlay / manual)

No automatic sync.

**overlay** (e.g., `anthropic/bedrock`) — when the upstream changes:
1. Edit `upstream/<protocol>/<provider>/overlay.yml` (deltas only)
2. Update `lastEdited` and `lastReviewed` in `metadata.json`
3. `npm run resolve avs://<protocol>/<provider>` to verify the composed spec is sane
4. Commit

**manual** (none yet; e.g., if Baidu / Alibaba / Tencent are added):
1. Write `upstream/<protocol>/<provider>/openapi.yml` from official docs
2. Update `lastEdited` and `hash`
3. Commit

---

## Related docs

- [ARCHITECTURE](./ARCHITECTURE.md) — design, tier breakdown, schemas
- [README — Use cases](../README.md#use-cases) — common consumption patterns

---

## Contributing new sources

If you find a new source or a better way to fetch an existing one, open an issue or PR:

1. Fork ai-vendor-specs
2. Update `docs/SOURCES.md`
3. Update the corresponding sync script
4. Open a PR

**Acceptance bar**: only official or authoritative sources. Third-party rewrites, community wikis, and SDK-derived knowledge are not accepted as primary sources.
