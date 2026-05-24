# ai-vendor-specs Architecture

**Languages**: English · [简体中文](./ARCHITECTURE.zh-CN.md)

> Repository scope, data flow, and project features are covered in the [README](../README.md#how-it-works). This document focuses on design details: URI scheme, kind taxonomy, overlay syntax, metadata schema, and sync strategy.

## URI scheme: `avs://`

A unified URI for cross-file and cross-repo references:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

The resolver locates files based on caller context:

| Caller | `avs://anthropic/official` resolves to |
|---|---|
| ai-vendor-specs itself | `./upstream/anthropic/official/` |
| Consumer (npm install) | `./node_modules/@aihubmix/ai-vendor-specs/upstream/anthropic/official/` |
| Consumer (git submodule) | `./ai-vendor-specs/upstream/anthropic/official/` |

Authors don't need to think about deployment mode — the resolver in [`scripts/overlay/apply.js`](../scripts/overlay/apply.js) figures it out.

Detailed resolution order:

1. The `AVS_ROOT` environment variable (explicit override)
2. `__dirname`-based: the resolver is at `<root>/scripts/overlay/apply.js`, so `root` is two levels up — works regardless of install location
3. Fallback: `cwd`, then `cwd/node_modules/@aihubmix/ai-vendor-specs`, then `cwd/ai-vendor-specs`
4. None match → throws

## Three kinds of upstream entries

Every `metadata.json` has a required `kind` field:

### `kind: "spec"`

Upstream publishes a machine-readable spec. The original file is stored as-is and refreshed by sync scripts.

```jsonc
// upstream/openai/official/metadata.json
{
  "protocol": "openai",
  "provider": "official",
  "displayName": "OpenAI Official",
  "kind": "spec",
  "specFormat": "openapi-3.1",
  "source": "https://app.stainless.com/...",
  "hash": "sha256:9fe021...",
  "lastSynced": "2026-05-24T...",
  "autoSync": true
}
```

### `kind: "overlay"`

Upstream has no standalone spec, so the differences are declared as an overlay. Two common cases:

- **Envelope-only variants** — same payload, different URL/auth/headers (e.g., Claude on AWS Bedrock against `anthropic/official`)
- **OpenAI-compatible providers** — server URL swap with a few extension fields (xAI, Groq, DeepSeek, Together)

```jsonc
// upstream/anthropic/bedrock/metadata.json
{
  "protocol": "anthropic",
  "provider": "bedrock",
  "displayName": "Anthropic Claude on AWS Bedrock",
  "kind": "overlay",
  "base": "avs://anthropic/official",
  "overlayPath": "upstream/anthropic/bedrock/overlay.yml",
  "lastEdited": "2026-05-24T00:00:00Z",
  "lastReviewed": "2026-05-24",
  "lastReviewedDocs": [
    "https://docs.anthropic.com/en/api/claude-on-amazon-bedrock"
  ],
  "autoSync": false
}
```

For overlay file examples see [`upstream/anthropic/bedrock/overlay.yml`](../upstream/anthropic/bedrock/overlay.yml) and [`upstream/openai/xai/overlay.yml`](../upstream/openai/xai/overlay.yml).

### `kind: "manual"` (no entries yet)

Reserved for upstreams that have neither a machine-readable spec nor a near-relative variant we can derive from. The OpenAPI is hand-written from official documentation.

```jsonc
{
  "kind": "manual",
  "specFormat": "openapi-3.0",
  "source": "https://docs.example.com/api",
  "lastEdited": "2026-..."
}
```

`manual` entries carry lower authority than `spec` or `overlay` because there's no upstream machine-readable source to cross-check against. Strict review before merging.

## `overlay.yml` syntax

```yaml
# upstream/anthropic/bedrock/overlay.yml

# Required — base is another avs:// URI
base: avs://anthropic/official

# Full replacement of the info block
info:
  title: Anthropic Claude on AWS Bedrock
  version: bedrock-2023-05-31

# Full replacement of servers
servers:
  - url: https://bedrock-runtime.{region}.amazonaws.com
    variables: { ... }

# Map a base path to a new path; optionally attach path parameters
pathRewrites:
  - from: /v1/messages
    to: /model/{modelId}/invoke
    pathParameters:
      - name: modelId
        in: path
        required: true
        schema: { type: string }

# Keep only the listed paths from base; drop everything else
pathsKeep:
  - /v1/messages

# drop / add / modify properties on components.schemas.<Name>
requestBodyOverrides:
  CreateMessageRequest:
    drop: [model]
    add:
      anthropic_version:
        type: string
        enum: [bedrock-2023-05-31]
        required: true        # promotes to schema.required

# drop / add auth schemes
security:
  drop: [x-api-key]
  add:
    awsSigV4: { type: apiKey, in: header, name: Authorization }

# Remove global headers / query parameters
parametersDrop:
  - anthropic-version
  - anthropic-beta
```

The resolver implements this grammar via `applyOverlay()` in [`scripts/overlay/apply.js`](../scripts/overlay/apply.js).

## Sync strategy

| Tier | Source type | Automation | Update trigger |
|---|---|---|---|
| 1 | Upstream-published machine-readable spec | Fully automatic, daily cron | sync-bot |
| 2 | Google Discovery (its own format) | Fully automatic, daily cron | sync-bot |
| 3 | No machine-readable spec (overlay / manual) | Manual | Human (watching upstream docs) |

After all Tier 1/2 syncs run, `scripts/sync-all.sh` regenerates `manifest.json` and runs `check-drift.js` automatically.

## `metadata.json` schema

All `metadata.json` files share one schema:

| Field | Required when | Notes |
|---|---|---|
| `protocol` | always | Matches the first-level directory name |
| `provider` | always | Matches the second-level directory name |
| `displayName` | always | Human-readable name |
| `kind` | always | `spec` / `overlay` / `manual` |
| `specFormat` | spec, manual | `openapi-3.0` / `openapi-3.1` / `google-discovery` |
| `source` | spec | Upstream download URL |
| `base` | overlay | An `avs://` URI |
| `overlayPath` | overlay | Path to `overlay.yml` relative to repo root |
| `hash` | spec | SHA-256 of the spec file |
| `lastSynced` | spec | Last automatic sync time |
| `lastEdited` | overlay, manual | Last manual edit |
| `lastReviewed` | overlay | Last date official docs were reviewed |
| `lastReviewedDocs` | overlay | Array of doc URLs reviewed |
| `autoSync` | always | Boolean — whether this entry syncs automatically |

## `manifest.json` schema (top-level)

Generated by [`scripts/build-manifest.js`](../scripts/build-manifest.js) — it walks `upstream/` and emits a single JSON file. See the script for the full field list.

Consumers can read it directly:

```js
// npm install
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

// git submodule
const manifest = require('./ai-vendor-specs/manifest.json');
```

Or fetch over HTTP with no runtime:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

## Validation

```bash
npm run validate                            # check directory + metadata
npm run resolve avs://anthropic/bedrock     # try resolving an overlay
npm run drift                               # drift detection
```

`validate` checks:
- Every `upstream/<protocol>/<provider>/` has a `metadata.json`
- `spec` entries have at least one of `openapi.yml | openapi.json | discovery.json`
- `overlay` entries have an `overlay.yml`
- All `metadata.json` files are valid JSON

`resolve` parses any `avs://` URI and prints the result to stdout. For overlay entries, it composes the full spec first.

`drift` runs four classes of checks (version tracking / overlay freshness / overlay resolve health / spec file sanity). Details in [SOURCES.md](./SOURCES.md#drift-detection).
