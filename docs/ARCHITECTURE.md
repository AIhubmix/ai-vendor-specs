# ai-vendor-specs 架构设计

## 仓库定位

ai-vendor-specs 是**上游 AI 协议 spec 收集库**,职责单一:

- ✅ 同步各上游厂商(OpenAI、Anthropic、Cohere、Google、Microsoft 以及一众 OpenAI 兼容厂商)发布的官方 OpenAPI / Discovery 规范
- ✅ 对没有机器可读 spec 的上游变体(如 AWS Bedrock 上的 Claude、OpenAI 兼容厂商)用 overlay 文件声明差异
- ✅ 维护顶层 `manifest.json`,作为外部发现入口
- ❌ **不**生成任何派生产物(成品 spec、SDK、契约 fixture 等)
- ❌ **不**记录任何消费方业务字段

> 判断口诀:**"这描述的是上游真实存在的东西吗?"** 是 → 放 ai-vendor-specs;否 → 由消费方自己维护。

## 整体数据流

```
┌──────────────────────────────────────────────────────────────┐
│ 上游厂商                                                       │
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google /       │
│   xAI / DeepSeek / Groq / Together / Bedrock                  │
└────────────────────────────┬─────────────────────────────────┘
                             │ 每日 cron sync(spec)
                             │ 手维护 overlay(无机器可读 spec 时)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ ai-vendor-specs(本仓库)                                       │
│                                                              │
│  upstream/openai/official/openapi.yml      ← Stainless        │
│  upstream/openai/azure/openapi.json        ← Azure REST       │
│  upstream/openai/xai/overlay.yml           ← docs.x.ai        │
│  upstream/anthropic/official/openapi.yml   ← SDK .stats.yml   │
│  upstream/anthropic/bedrock/overlay.yml    ← 无 spec, overlay │
│  upstream/cohere/official/openapi.yml      ← cohere-developer-exp│
│  upstream/gemini/official/discovery.json   ← Google Discovery │
│  upstream/vertex/official/discovery.json   ← Google Discovery │
│  ...                                                          │
│                                                              │
│  manifest.json            ← 顶层索引,所有上游一览              │
│  scripts/overlay/apply.js ← avs:// resolver + applier 库      │
│  scripts/check-drift.js   ← 漂移检测(版本/freshness/sanity) │
│  scripts/notify.js        ← Webhook 通知(wxwork/Slack/...)  │
└────────────────────────────┬─────────────────────────────────┘
                             │ npm / submodule / raw / CDN
                             ▼
        ┌────────────────────┼─────────────────────┐
        ▼                    ▼                     ▼
   SDK 生成器            网关 / proxy        文档站 / 契约测试
   IDE 智能提示          (拼装最终 spec)     AI agent 工具注册
```

## 引用协议:`avs://`

跨文件、跨仓库的统一 URI scheme:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

resolver 在不同位置自动定位:

| 调用方 | `avs://anthropic/official` 解析到 |
|---|---|
| ai-vendor-specs 本身 | `./upstream/anthropic/official/` |
| 消费方(npm 安装) | `./node_modules/@aihubmix/ai-vendor-specs/upstream/anthropic/official/` |
| 消费方(git submodule) | `./ai-vendor-specs/upstream/anthropic/official/` |

写引用的人不感知,resolver(`scripts/overlay/apply.js`)自动找。

详细 resolve 顺序:

1. 环境变量 `AVS_ROOT` 优先
2. `cwd` 自身有 `upstream/` + `scripts/overlay/apply.js` → 是 ai-vendor-specs 自身
3. `cwd/node_modules/@aihubmix/ai-vendor-specs` 存在 → npm 安装的用法
4. `cwd/ai-vendor-specs` 存在 → git submodule 用法
5. 都没有 → 报错

## 上游条目的三种 kind

`metadata.json` 必有字段 `kind`(若缺省,默认按 spec 处理):

### kind: spec

有机器可读 spec 的上游,直接存原始 spec 文件:

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

### kind: overlay

上游无独立 spec,用 overlay 声明差异。两种典型场景:envelope 差异(Bedrock)和 OpenAI 兼容厂商(xAI / Groq / DeepSeek / Together)。

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

overlay.yml 自身见 [upstream/anthropic/bedrock/overlay.yml](../upstream/anthropic/bedrock/overlay.yml) 和 [upstream/openai/xai/overlay.yml](../upstream/openai/xai/overlay.yml)。

### kind: manual(暂无条目)

上游既没 spec、也无近亲变体可派生,只能从文档手抄 OpenAPI:

```jsonc
{
  "kind": "manual",
  "specFormat": "openapi-3.0",
  "source": "https://docs.example.com/api",
  "lastEdited": "2026-..."
}
```

`manual` 类条目权威性低于 spec 和 overlay,因为没有任何上游机器可读源做交叉校验。加入前需要严格审阅。

## overlay.yml 语法

```yaml
# upstream/anthropic/bedrock/overlay.yml

# base 是另一个 avs:// URI
base: avs://anthropic/official

# 全 info 段覆写
info:
  title: Anthropic Claude on AWS Bedrock
  version: bedrock-2023-05-31

# servers 整段替换
servers:
  - url: https://bedrock-runtime.{region}.amazonaws.com
    variables: { ... }

# 路径重写:把 base 中某 path 映射到新 path,可附加 path 参数
pathRewrites:
  - from: /v1/messages
    to: /model/{modelId}/invoke
    pathParameters:
      - name: modelId
        in: path
        required: true
        schema: { type: string }

# 只保留 base 中的这些 paths(其它丢弃)
pathsKeep:
  - /v1/messages

# 对 components.schemas.<Name> 做 drop/add/modify
requestBodyOverrides:
  CreateMessageRequest:
    drop: [model]
    add:
      anthropic_version:
        type: string
        enum: [bedrock-2023-05-31]
        required: true        # 提升到 schema.required

# 认证 schemes 增删
security:
  drop: [x-api-key]
  add:
    awsSigV4: { type: apiKey, in: header, name: Authorization }

# 全局 header/parameter 移除
parametersDrop:
  - anthropic-version
  - anthropic-beta
```

resolver(`scripts/overlay/apply.js` 中的 `applyOverlay()`)按此语法实现合成。

## 同步策略

| Tier | 来源 | 自动化 | 更新触发 |
|---|---|---|---|
| 1 | 上游公开机器可读 spec | 完全自动,每日 cron | sync-bot |
| 2 | Google Discovery(独立格式) | 完全自动,每日 cron | sync-bot |
| 3 | 无机器可读 spec(overlay / manual) | 不自动 | 人(关注上游文档变更) |

`scripts/sync-all.sh` 跑完所有 Tier 1/2 sync 后,自动重建 `manifest.json` 并运行 `check-drift.js`。

## metadata.json schema

仓库中所有 `metadata.json` 共用一个 schema:

| 字段 | 必填 | 说明 |
|---|---|---|
| `protocol` | ✅ | 协议名,与一级目录名一致 |
| `provider` | ✅ | 变体名,与二级目录名一致 |
| `displayName` | ✅ | 人类可读名 |
| `kind` | ✅ | `spec` / `overlay` / `manual` |
| `specFormat` | spec / manual | `openapi-3.0` / `openapi-3.1` / `google-discovery` |
| `source` | spec | 上游下载 URL |
| `base` | overlay | avs:// URI |
| `overlayPath` | overlay | overlay.yml 相对路径 |
| `hash` | spec | spec 文件 sha256 |
| `lastSynced` | spec | 上次自动同步时间 |
| `lastEdited` | overlay / manual | 上次人编辑时间 |
| `lastReviewed` | overlay | 上次复查官方 docs 的日期 |
| `lastReviewedDocs` | overlay | 复查时读过的官方 docs URL 列表 |
| `autoSync` | ✅ | 是否自动同步(布尔) |

## manifest.json schema(顶层)

`scripts/build-manifest.js` 扫描 `upstream/` 生成,字段见 `scripts/build-manifest.js` 实现。

消费方接入 ai-vendor-specs 之后,直接读文件即可:

```js
// npm 安装
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

// submodule 形式
const manifest = require('./ai-vendor-specs/manifest.json');
```

或不经运行时,直接 HTTP 拉取:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

## 验证

```bash
npm run validate                            # 校验目录 + metadata
npm run resolve avs://anthropic/bedrock     # 试着 resolve 某个 overlay
npm run drift                               # 漂移检测
```

`validate` 检查:
- 每个 `upstream/<protocol>/<provider>/` 都有 `metadata.json`
- spec 类条目至少有 `openapi.yml | openapi.json | discovery.json` 之一
- overlay 类条目至少有 `overlay.yml`
- `metadata.json` JSON 合法

`resolve` 把任意 `avs://` URI 解析并打印结果到 stdout。overlay 类会先合成完整 spec。

`drift` 跑四类检测(版本追踪 / overlay 新鲜度 / overlay resolve 健康度 / spec 文件完整性),详见 [SOURCES.md](./SOURCES.md#drift-检测scriptscheck-driftjs)。
