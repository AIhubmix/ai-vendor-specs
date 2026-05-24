# ai-vendor-specs(内部仓库)

> 上游 AI 协议 spec 仓库:每天同步 OpenAI / Anthropic / Cohere / Gemini / Vertex / Azure 等上游的官方规范。
> 对没有机器可读 spec 的上游(如 AWS Bedrock 上的 Claude),用 overlay 文件声明差异。

**⚠️ 仅内部使用,不发 npm**。本仓库为 [aihubmix-openapi](#相关仓库) 等内部项目提供上游 spec 数据。
公开消费方应读 aihubmix-openapi 发布的 `openapi.json`,不直接访问本仓库。

**ai-vendor-specs 不生产网关产物**,只维护上游事实。生产真相源(`openapi.json`)的事归 [aihubmix-openapi](#相关仓库) 仓库。

---

## 仓库定位

```
ai-vendor-specs (本仓库)              ← 上游 vendor API 知识库,纯数据
       │
       │ file: 依赖 / git submodule(本仓库私有,不发 npm)
       ▼
aihubmix-openapi(另一仓库)        ← 组合 ai-vendor-specs + 网关自家差异 → 编译 openapi.json
       │
       │ GitHub Release / jsDelivr CDN
       ▼
┌───────────┬──────────────┬─────────────────┐
▼           ▼              ▼                 ▼
gateway   运营后台      文档站          SDK 生成器
服务实现   /Playground   /API portal     /code-gen
```

| 角色 | 仓库 | 输出 |
|---|---|---|
| 上游 spec 维护 | **ai-vendor-specs**(本仓库) | `upstream/<协议>/<变体>/` + 顶层 `manifest.json` |
| 网关 spec 编译 | aihubmix-openapi | `openapi.json` + `manifest.json` + `CHANGELOG.md` |
| 网关业务实现 | aihubmix-service | 实际网关代码,按 `openapi.json` 实现并跑契约测试 |
| 其他消费方 | playground / docs / SDK 等 | 各自 `curl` aihubmix-openapi 的 `openapi.json` |

---

## 目录结构

```
ai-vendor-specs/
├── README.md
├── LICENSE
├── package.json
├── manifest.json                       ← ★ 顶层入口,列所有上游 + 拉取 URL
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SOURCES.md                      ← 上游来源 + 同步方法
│   └── USAGE.md
├── upstream/
│   ├── openai/
│   │   ├── official/{openapi.yml, metadata.json}        Stainless 同步
│   │   ├── azure/{openapi.json, metadata.json}          Azure REST API Specs(stable 2024-10-21)
│   │   ├── azure-preview/{openapi.json, metadata.json}  Azure preview 2025-04-01-preview(含 o1/o3/audio 等新字段)
│   │   ├── groq/{overlay.yml, metadata.json}            OpenAI-compatible,只换 server URL
│   │   ├── together/{overlay.yml, metadata.json}        OpenAI-compatible
│   │   └── deepseek/{overlay.yml, metadata.json}        OpenAI-compatible(R1 有 reasoning_content)
│   ├── anthropic/
│   │   ├── official/{openapi.yml, metadata.json}     SDK .stats.yml → Stainless
│   │   └── bedrock/{overlay.yml, metadata.json}      只有 overlay,无独立 spec
│   ├── cohere/official/{openapi.yml, metadata.json}  cohere-developer-experience
│   ├── gemini/official/{discovery.json, metadata.json}  Google Discovery
│   └── vertex/official/{discovery.json, metadata.json}  Google Discovery
└── scripts/
    ├── sync/                           上游同步脚本(每天 cron)
    ├── overlay/apply.js                ★ avs:// resolver + applier 库
    ├── build-manifest.js               生成顶层 manifest.json
    ├── sync-all.sh
    ├── validate-all.sh
    └── utils.sh
```

---

## 引用协议:`avs://`

所有 overlay 和消费方都用同一套语法,resolver 自动定位文件:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

| 示例 | 含义 |
|---|---|
| `avs://anthropic/official` | 整份 anthropic/official spec |
| `avs://anthropic/official#/components/schemas/Message` | 那份 spec 里的 `Message` schema |
| `avs://openai/official#/components/schemas/CreateChatCompletionRequest` | 跨上游引用 |

Resolver 行为(`scripts/overlay/apply.js`):
- 在 ai-vendor-specs 自身 → 解析到 `./upstream/<protocol>/<provider>/`
- 在消费方(如 aihubmix-openapi)→ 解析到 `./node_modules/ai-vendor-specs/upstream/<protocol>/<provider>/`

写 overlay 的人**完全不感知**当前在哪个仓库。

---

## 三种上游条目

### 1. `spec`:有机器可读 spec(Tier 1/2)

直接同步上游 spec 文件,自动化。代表:`openai/official`、`anthropic/official`、`cohere/official`、`gemini/official`、`vertex/official`、`openai/azure`。

```
upstream/openai/official/
├── openapi.yml          ← 同步自 Stainless
└── metadata.json        ← hash / lastSynced / source URL
```

### 2. `overlay`:上游无 spec,用 overlay 声明差异(Tier 3)

上游本身没发布机器可读 spec,但和另一个有 spec 的变体只是 envelope 不同(URL / 认证 / 个别字段)。代表:`anthropic/bedrock`。

```
upstream/anthropic/bedrock/
├── overlay.yml          ← 声明 base + 差异
└── metadata.json        ← kind: overlay, base: avs://...
```

消费方 build 时由 resolver 把 base + overlay 合成完整 spec,ai-vendor-specs 这边不落盘派生物。

### 3. `manual`(未来):纯人写

上游既没 spec、也无可派生的近亲(比如百度文心、阿里通义)。需要从官方文档手抄一份 OpenAPI 进来,标 `authority: manual`。

---

## 顶层 `manifest.json`(内部发现入口)

内部消费方一个文件拿到全景:

```js
// 已通过 file: 或 submodule 接入 ai-vendor-specs 的项目里
const manifest = require('ai-vendor-specs/manifest.json');
```

或直接读文件:

```bash
cat path/to/ai-vendor-specs/manifest.json
```

> ⚠️ **不要**用公网 CDN(jsDelivr 等)拉取本仓库 —— 本仓库为私有,公网拉不到。
> 公开消费方应读 [aihubmix-openapi](https://github.com/<org>/aihubmix-openapi) 的 `openapi.json`,不通过 ai-vendor-specs。

返回结构(节选):

```jsonc
{
  "schemaVersion": 1,
  "name": "ai-vendor-specs",
  "generatedAt": "2026-05-24T...",
  "repository": "<org>/ai-vendor-specs",
  "upstream": {
    "openai/official": {
      "kind": "spec",
      "specFormat": "openapi-3.1",
      "uri": "avs://openai/official",
      "specPath": "upstream/openai/official/openapi.yml",
      "hash": "sha256:9fe021...",
      "syncedAt": "2026-05-19T12:27:12Z",
      "sourceUrl": "https://app.stainless.com/api/spec/documented/openai/openapi.documented.yml",
      "rawUrl": "https://raw.githubusercontent.com/.../upstream/openai/official/openapi.yml",
      "cdnUrl": "https://cdn.jsdelivr.net/gh/.../upstream/openai/official/openapi.yml"
    },
    "anthropic/bedrock": {
      "kind": "overlay",
      "base": "avs://anthropic/official",
      "uri": "avs://anthropic/bedrock",
      "overlayPath": "upstream/anthropic/bedrock/overlay.yml",
      ...
    }
  }
}
```

---

## 常用操作

```bash
npm install
npm run sync              # 同步所有上游 + 重建 manifest.json
npm run validate          # 校验目录结构
npm run manifest          # 单独重建 manifest.json
npm run resolve avs://anthropic/bedrock   # 验证 overlay 能正确 resolve
```

### 添加新上游(有 spec)

1. 在 `scripts/sync/` 加同步脚本(参考 `openai-official.sh`)
2. 在 `scripts/sync-all.sh` 加调用
3. 跑 `npm run sync` 验证

### 添加新上游(只有 overlay)

1. `mkdir upstream/<protocol>/<provider>`
2. 写 `overlay.yml`(参考 `upstream/anthropic/bedrock/overlay.yml`)
3. 写 `metadata.json`(`kind: overlay`,声明 `base`)
4. 跑 `npm run resolve avs://<protocol>/<provider>` 验证能合成完整 spec
5. `npm run manifest` 刷新顶层索引

---

## 消费方接入(给 aihubmix-openapi / 其他内部下游用)

本仓库**不发 npm**。消费方仓库通过以下任一方式接入:

```bash
# 方式 A: file: 依赖(本机开发,同级目录)
# 在消费方 package.json 写:
#   "dependencies": { "ai-vendor-specs": "file:../ai-vendor-specs" }
npm install

# 方式 B: git submodule(CI / 不同机器)
git submodule add git@github.com:<内部 org>/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs

# 方式 C: 内部 tarball
npm pack /path/to/ai-vendor-specs       # 产出 ai-vendor-specs-1.0.0.tgz
# 消费方仓库:npm install /path/to/ai-vendor-specs-1.0.0.tgz
```

接入后代码侧调用 resolver:

```js
const { loadSpec, applyOverlay } = require('ai-vendor-specs');

// 加载任意上游 spec(overlay 自动 resolve)
const bedrockSpec = loadSpec('avs://anthropic/bedrock');

// 加载具体 schema
const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);

// 应用消费方自己的 overlay
const finalSpec = applyOverlay(bedrockSpec, myGatewayOverlay);
```

---

## 相关仓库

| 仓库 | 用途 |
|---|---|
| **ai-vendor-specs**(本仓库) | 上游 spec 收集 + 维护 |
| **aihubmix-openapi** | 网关 spec 编译,产出 `openapi.json` 作为唯一真相源 |
| **aihubmix-service** | 网关业务实现 |

详见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

---

## License

Internal use only(UNLICENSED)。如未来开放给公网,需另行评估并补 LICENSE 文件。
