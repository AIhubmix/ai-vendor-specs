# Contributing

This guide is for **contributors** — people maintaining the repo, adding new vendors, or extending the sync infrastructure. For consumer-facing docs, see the [README](./README.md).

## Repository structure

```
ai-vendor-specs/
├── manifest.json                       # Generated discovery index — do not hand-edit
├── docs/
│   ├── ARCHITECTURE.md                 # Design + metadata schema + overlay syntax
│   ├── SOURCES.md                      # Upstream URLs and per-vendor sync details
│   └── USAGE.md                        # Consumer scenarios
├── upstream/<protocol>/<provider>/     # Per-vendor data
│   ├── metadata.json                   # Required for every entry
│   ├── openapi.{yml,json} | discovery.json   # for kind=spec
│   └── overlay.yml                     # for kind=overlay
├── scripts/
│   ├── sync/<vendor>.sh                # Per-vendor sync scripts (cron-driven)
│   ├── overlay/apply.js                # avs:// resolver + overlay applier
│   ├── build-manifest.js               # Generates manifest.json
│   ├── check-drift.js                  # Drift detection (versions, freshness, sanity)
│   ├── notify.js                       # Webhook notifier (multi-channel)
│   ├── sync-all.sh
│   └── validate-all.sh
└── python/                              # PyPI package — shares upstream/ data
    ├── pyproject.toml                   # hatchling-based build, MIT, py>=3.9
    ├── prepare-pypi.sh                  # copies upstream/ + manifest.json into _data/ pre-build
    └── ai_vendor_specs/
        ├── __init__.py                  # load_manifest / list_vendors / get_vendor / load_spec_path
        └── py.typed
```

## Common operations

```bash
npm install
npm run sync              # Sync all upstreams, then rebuild manifest
npm run validate          # Validate directory structure + metadata.json
npm run manifest          # Rebuild manifest.json only
npm run drift             # Drift check (versions / overlay freshness / file sanity)
npm run resolve avs://anthropic/bedrock   # Verify an overlay resolves
```

## Adding a new vendor

### When the upstream publishes a machine-readable spec

1. Add a sync script under `scripts/sync/` (model after `scripts/sync/openai-official.sh`)
2. Add the script to `scripts/sync-all.sh`
3. If the upstream uses version pinning (e.g. Azure preview), register a tracker in `scripts/check-drift.js` (`versionTrackers`)
4. Run `npm run sync` to fetch and verify
5. Run `npm run manifest` to refresh the index

### When the upstream has no spec, only docs (overlay)

This covers OpenAI-compatible providers (Groq, Together, DeepSeek, xAI) and envelope-only variants (Bedrock).

1. `mkdir upstream/<protocol>/<provider>`
2. Write `overlay.yml`, declaring `base: avs://<protocol>/<base-provider>` and the deltas (servers, info, paths, etc.). Model after [`upstream/openai/xai/overlay.yml`](./upstream/openai/xai/overlay.yml).
3. Write `metadata.json` with:
   - `kind: "overlay"`
   - `base: "avs://..."`
   - `lastReviewedDocs: [...]` — every official doc URL you read while writing the overlay
   - `lastReviewed: "YYYY-MM-DD"`
4. Cite the upstream docs in a comment block at the top of `overlay.yml` (URL + verified date) so future reviewers can audit the source
5. Run `npm run resolve avs://<protocol>/<provider>` to verify the composed spec
6. Run `npm run manifest` to refresh the index

### When there are no docs of any usable form (manual)

Reserved for vendors with web-only documentation that must be transcribed by hand. Mark `kind: "manual"` and provide a hand-written `openapi.yml`. No such entries currently exist; coordinate before adding one — the authority bar is higher because nothing is cross-checked against an upstream.

## Drift detection

`scripts/check-drift.js` runs four classes of checks every CI sync:

| Check | Triggers on |
|---|---|
| Version tracking | Upstream GitHub directory shows a newer version than the pinned one |
| Overlay freshness | `lastReviewed` is older than 90 days |
| Overlay resolve health | `loadSpec('avs://X/Y')` fails (base changed in a way incompatible with the overlay) |
| Spec file sanity | A spec file starts with `404:`, `<html>`, `error:` (a sync silently failed) |

Output goes to `.drift-report.md` (gitignored — regenerated each run). The script always exits 0 — drift is reported but does not block sync. Push the report into a webhook channel by configuring the notifier (below).

## Webhook notifications

`scripts/notify.js` sends drift summaries to any HTTP endpoint. Channel type is auto-detected from the URL domain:

| URL pattern | Channel |
|---|---|
| `qyapi.weixin.qq.com/...` | WeChat Work (markdown) |
| `hooks.slack.com/...` | Slack (mrkdwn) |
| `discord.com/api/webhooks/...` | Discord (content) |
| Anything else | Generic `POST {text, message}` |

Override the detected type with `AVS_WEBHOOK_TYPE` if needed.

### Local

```bash
cp .env.example .env.local
# edit .env.local, set AVS_WEBHOOK_URL
npm run drift   # if drift detected, posts to your webhook
```

`.env.local` is gitignored. Without `AVS_WEBHOOK_URL`, notify is a silent no-op so forks need no configuration.

### CI

Add `AVS_WEBHOOK_URL` (and optionally `AVS_WEBHOOK_TYPE`) to GitHub repository **Settings → Secrets and variables → Actions**. The workflow `.github/workflows/sync-daily.yml` already injects them into the drift step.

### CLI usage

The notifier is also usable as a standalone CLI for arbitrary messages:

```bash
node scripts/notify.js "Manual ping from operator"
echo "Multi-line message" | node scripts/notify.js
```

## `metadata.json` schema

| Field | Required when | Notes |
|---|---|---|
| `protocol` | always | Matches top-level directory name |
| `provider` | always | Matches second-level directory name |
| `displayName` | always | Human-readable name |
| `kind` | always | `spec` / `overlay` / `manual` |
| `specFormat` | spec, manual | `openapi-3.0` / `openapi-3.1` / `google-discovery` |
| `source` | spec | Upstream download URL |
| `base` | overlay | An `avs://` URI |
| `overlayPath` | overlay | Path to overlay.yml relative to repo root |
| `hash` | spec | SHA-256 of the spec file |
| `lastSynced` | spec | Last automatic sync time |
| `lastEdited` | overlay, manual | Last manual edit |
| `lastReviewed` | overlay | Last date the official docs were reviewed |
| `lastReviewedDocs` | overlay | Array of doc URLs reviewed |
| `autoSync` | always | Boolean — does the entry sync automatically |

## Overlay syntax

See [`upstream/anthropic/bedrock/overlay.yml`](./upstream/anthropic/bedrock/overlay.yml) for a full worked example and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the schema. Supported operations:

| Field | Effect |
|---|---|
| `base: avs://...` | Required — references the base spec |
| `info`, `servers` | Full replacement |
| `pathRewrites` | Map a base path to a new path with extra path parameters |
| `pathsKeep` | Keep only listed paths from the base; drop the rest |
| `requestBodyOverrides` | `drop` / `add` / modify properties on `components.schemas.<Name>` |
| `security` | `drop` / `add` auth schemes |
| `parametersDrop` | Remove global headers / query params |

## Releasing

Releases are deliberate. The daily sync workflow no longer auto-bumps versions; the maintainer cuts a release by pushing a tag.

```bash
# Bump npm package version (also drives the PyPI tag since both use the same git tag)
npm version patch   # or minor / major
git push --tags     # triggers both publish-npm.yml and publish-pypi.yml in parallel
```

Both publish workflows accept `workflow_dispatch` with a `dry-run` input for verifying contents without uploading.

### Keeping npm + PyPI versions in sync

The Python `__version__` in `python/ai_vendor_specs/__init__.py` and `version` in `python/pyproject.toml` must match the npm `version`. Update all three when bumping. (A future maintenance script may automate this.)

### One-time setup

| Registry | Auth mechanism | Action |
|---|---|---|
| npm | `NPM_TOKEN` repo secret | Generate an Automation token at npmjs.com → Account Settings → Access Tokens; add as `NPM_TOKEN` in GitHub repo Settings → Secrets and variables → Actions |
| PyPI | Trusted publisher (OIDC) | PyPI project page → Manage → Publishing → Add trusted publisher. Owner=`AIhubmix`, Repository=`ai-vendor-specs`, Workflow=`publish-pypi.yml`. Use PyPI's "pending trusted publisher" mechanism for the first publish before the project exists. |

## Python package development

```bash
# editable install for local dev
pip install -e ./python

# build sdist + wheel locally
bash python/prepare-pypi.sh
cd python && python -m build
ls dist/
```

The data is bundled via `prepare-pypi.sh` copying `upstream/` and `manifest.json` into `python/ai_vendor_specs/_data/`. That `_data/` directory is gitignored — only the wheel/sdist embeds it.

The Python API is deliberately small (read-only data access). Overlay composition remains JavaScript-only for v0.1.x; a Python composer ships when the overlay grammar stabilizes.

## Pull request checklist

- [ ] `npm run sync` runs successfully (if a sync script was added)
- [ ] `npm run validate` passes
- [ ] `npm run manifest` produces a clean diff
- [ ] `npm run drift` reports no new errors
- [ ] For new overlay entries: `metadata.json` has `lastReviewedDocs` URLs cited in `overlay.yml` top comment
- [ ] Any cited doc URL must be from the **official** upstream (vendor's own docs, SDK repo, or government-grade source). Third-party blog posts, SDK reverse-derived knowledge, and community wikis are not accepted as overlay sources.

## License

MIT
