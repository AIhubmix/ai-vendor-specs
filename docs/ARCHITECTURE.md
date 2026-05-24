# ai-vendor-specs 架构设计

## 仓库定位

ai-vendor-specs 是**上游 AI 协议 spec 收集库**,职责单一:

- ✅ 同步各上游厂商(OpenAI、Anthropic、Cohere、Google、Microsoft)发布的官方 OpenAPI/Discovery 规范
- ✅ 对没有机器可读 spec 的上游变体(如 AWS Bedrock 上的 Claude)用 overlay 文件声明差异
- ✅ 维护顶层 `manifest.json`,作为外部发现入口
- ❌ **不**生成网关产物 `openapi.json`(那是 `aihubmix-openapi` 仓库的职责)
- ❌ **不**记录任何业务字段(`x_gateway_channel`、自家 auth schema 等)

判断口诀:**"这描述的是上游真实存在的东西吗?"** 是 → 放 ai-vendor-specs;否 → 放 aihubmix-openapi。

## 整体引用流程

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 0  上游厂商                                              │
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google         │
└────────────────────────────┬─────────────────────────────────┘
                             │ 每日 cron sync
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 1  ai-vendor-specs(本仓库)                                 │
│                                                              │
│  upstream/openai/official/openapi.yml      ← Stainless        │
│  upstream/openai/azure/openapi.json        ← Azure REST       │
│  upstream/anthropic/official/openapi.yml   ← SDK .stats.yml   │
│  upstream/anthropic/bedrock/overlay.yml    ← 无 spec, overlay │
│  upstream/cohere/official/openapi.yml      ← cohere-developer-exp│
│  upstream/gemini/official/discovery.json   ← Google Discovery │
│  upstream/vertex/official/discovery.json   ← Google Discovery │
│                                                              │
│  manifest.json            ← 顶层索引,所有上游一览              │
│  scripts/overlay/apply.js ← 引用协议 resolver + applier 库    │
└────────────────────────────┬─────────────────────────────────┘
                             │ file:../ai-vendor-specs / submodule
                             │ (ai-vendor-specs 是内部仓库,不发 npm)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 2  aihubmix-openapi(另一仓库,网关 spec 编译项目)        │
│                                                              │
│  ai-vendor-specs/             ← 依赖,只读上游                    │
│  base.yml                 ← 选哪些上游端点作骨架               │
│  overlays/                ← ★ 网关自家差异(auth/错误体/扩展)│
│  extensions/              ← 网关独有端点(channels/keys)      │
│  scripts/build.js         ← 编译                              │
│                                                              │
│  openapi.json             ← ★ 真相源,提交进 git              │
│  manifest.json                                                │
│  CHANGELOG.md                                                 │
└────────────────────────────┬─────────────────────────────────┘
                             │ GitHub Release / jsDelivr CDN
                             ▼
        ┌────────────────────┼─────────────────────┐
        ▼                    ▼                     ▼
   aihubmix-service     运营后台/Playground   docs / SDK 生成
   (网关实现,跑契约测试) (展示对比版本)        (其他消费方)
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
| 消费方(file:../ai-vendor-specs 或内部 tarball) | `./node_modules/ai-vendor-specs/upstream/anthropic/official/` |
| 消费方(submodule) | `./ai-vendor-specs/upstream/anthropic/official/` |

写引用的人不感知,resolver(`scripts/overlay/apply.js`)自动找。

详细 resolve 顺序:

1. 环境变量 `AVS_ROOT` 优先
2. `cwd` 自身有 `upstream/` + `scripts/overlay/apply.js` → 是 ai-vendor-specs 自身
3. `cwd/node_modules/ai-vendor-specs` 存在 → file: 依赖 / 内部 tarball / npm pack 安装的用法
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
  "kind": "spec",              // 可缺省,默认值
  "specFormat": "openapi-3.1",
  "source": "https://app.stainless.com/...",
  "hash": "sha256:9fe021...",
  "lastSynced": "2026-05-19T12:27:12Z",
  "autoSync": true
}
```

### kind: overlay

上游无独立 spec,用 overlay 声明差异:

```jsonc
// upstream/anthropic/bedrock/metadata.json
{
  "protocol": "anthropic",
  "provider": "bedrock",
  "kind": "overlay",
  "base": "avs://anthropic/official",
  "overlayPath": "upstream/anthropic/bedrock/overlay.yml",
  "lastEdited": "2026-05-24T00:00:00Z",
  "autoSync": false
}
```

overlay.yml 自身见 [upstream/anthropic/bedrock/overlay.yml](../upstream/anthropic/bedrock/overlay.yml)。

### kind: manual(暂未使用)

上游既没 spec、也无近亲变体可派生,只能从文档手抄 OpenAPI:

```jsonc
{
  "kind": "manual",
  "specFormat": "openapi-3.0",
  "source": "https://docs.example.com/api",
  "authority": "manual",      // 标注权威等级,消费方知道这字段不那么可靠
  "lastEdited": "2026-..."
}
```

百度文心、阿里通义、腾讯混元等若纳入,走这条路。

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
        x-source: { from: anthropic/docs, authority: manual }

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

| Tier | 来源 | 自动化 | 谁负责更新 |
|---|---|---|---|
| 1 | 上游公开机器可读 spec | 完全自动,每日 cron | sync-bot |
| 2 | Google Discovery(独立格式) | 完全自动,每日 cron | sync-bot |
| 3 | 无机器可读 spec(overlay/manual) | 不自动 | 人(关注上游文档变更通知) |

`scripts/sync-all.sh` 跑完所有 Tier 1/2 sync 后,自动重建 `manifest.json`。

## metadata.json schema

仓库中所有 `metadata.json` 共用一个 schema:

| 字段 | 必填 | 说明 |
|---|---|---|
| `protocol` | ✅ | 协议名,与一级目录名一致 |
| `provider` | ✅ | 变体名,与二级目录名一致 |
| `displayName` | ✅ | 人类可读名 |
| `kind` | ✅(缺省=spec) | `spec` / `overlay` / `manual` |
| `specFormat` | spec/manual | `openapi-3.0` / `openapi-3.1` / `google-discovery` |
| `source` | spec | 上游下载 URL |
| `base` | overlay | avs:// URI |
| `overlayPath` | overlay | overlay.yml 相对路径 |
| `hash` | spec | spec 文件 sha256 |
| `lastSynced` | spec | 上次自动同步时间 |
| `lastEdited` | overlay/manual | 上次人编辑时间 |
| `autoSync` | ✅ | 是否自动同步 |

## manifest.json schema(顶层)

`scripts/build-manifest.js` 扫描 `upstream/` 生成,字段见 `scripts/build-manifest.js` 实现。

内部消费方接入 ai-vendor-specs 之后,直接读文件即可:

```js
const manifest = require('ai-vendor-specs/manifest.json');
// 或
const manifest = require('./ai-vendor-specs/manifest.json');  // submodule 形式
```

> 本仓库私有,不走公网 CDN(jsDelivr 等)。
> 公开消费方应读 aihubmix-openapi 的 `openapi.json`,不直接读 ai-vendor-specs。

## 验证

```bash
npm run validate                                # 校验目录 + metadata
npm run resolve avs://anthropic/bedrock # 试着 resolve 某个 overlay
```

`validate` 检查:
- 每个 `upstream/<protocol>/<provider>/` 都有 `metadata.json`
- spec 类条目至少有 `openapi.yml | openapi.json | discovery.json` 之一
- overlay 类条目至少有 `overlay.yml`
- `metadata.json` JSON 合法

`resolve` 把任意 `avs://` URI 解析并打印结果到 stdout。overlay 类会先合成完整 spec。

## 不在本仓库的东西(去 aihubmix-openapi 找)

| 东西 | 在哪 |
|---|---|
| 网关对外的 `openapi.json` 真相源 | aihubmix-openapi |
| 网关的 auth schema | aihubmix-openapi/overlays/auth.yml |
| 网关的统一错误体(`request_id` 等) | aihubmix-openapi/overlays/error-envelope.yml |
| 网关独有的端点(`/channels`、`/keys`) | aihubmix-openapi/extensions/ |
| 网关字段 `x_gateway_*` 的定义 | aihubmix-openapi/overlays/chat-completions.yml |
| 版本号 / CHANGELOG / GitHub Release | aihubmix-openapi |
| build / openapi-diff 集成 | aihubmix-openapi/scripts/build.js |
