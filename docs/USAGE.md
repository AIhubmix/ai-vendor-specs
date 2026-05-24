# ai-vendor-specs 使用指南

> 上游 AI 协议 spec 收集库。本指南面向**消费方**(主要是 `aihubmix-openapi` 这类合成项目,以及任何想直接读上游 spec 的工具)。

> ⚠️ **本仓库为内部私有,不发 npm 也不开放公网 CDN**。下文所有接入方式都是面向内部仓库(如 aihubmix-openapi)。

## 谁应该读这个仓库

只有两类**内部**消费方:

1. **`aihubmix-openapi`** —— 用 ai-vendor-specs 作为依赖,合成网关 `openapi.json`
2. **内部工具** —— 文档站展示 vendor API 原貌、内部 SDK 生成器、调研脚本等

**公开消费方**(网关用户、运营后台、Playground)**不读 ai-vendor-specs**,只读 `aihubmix-openapi` 仓库发布的 `openapi.json`(那是唯一对外真相源)。

## 接入方式(三选一)

### 方式 A:`file:` 依赖(本机开发,同级目录)

最适合 aihubmix-openapi 这种与 ai-vendor-specs 同级开发的场景:

```jsonc
// aihubmix-openapi/package.json
{
  "dependencies": {
    "ai-vendor-specs": "file:../ai-vendor-specs"
  }
}
```

```bash
npm install   # 创建 node_modules/ai-vendor-specs 指向 ../ai-vendor-specs 的 symlink
```

改 ai-vendor-specs 内容**立即生效**(symlink,不用 reinstall)。

### 方式 B:git submodule(CI / 其他机器)

```bash
git submodule add git@github.com:<内部 org>/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs

# resolver 能识别同级 ./ai-vendor-specs/ 路径
node -e "console.log(require('./ai-vendor-specs/scripts/overlay/apply').loadSpec('avs://anthropic/bedrock').info)"
```

### 方式 C:内部 tarball

CI 把 ai-vendor-specs 打 tarball,消费方按版本 pin:

```bash
# 在 ai-vendor-specs 仓库
npm pack                                  # 产出 ai-vendor-specs-1.0.0.tgz
# 推到内部对象存储 / artifact registry

# 消费方仓库
npm install https://<内部 registry>/ai-vendor-specs-1.0.0.tgz
```

适合不愿 submodule、又要钉版本的场景。

### 都接入完后:用法一样

```js
const { loadSpec } = require('ai-vendor-specs');

const openaiSpec  = loadSpec('avs://openai/official');
const bedrockSpec = loadSpec('avs://anthropic/bedrock');  // overlay + base 自动合成

const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

## avs:// 协议详细

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

### 例子

| URI | 解析为 |
|---|---|
| `avs://openai/official` | `upstream/openai/official/openapi.yml` |
| `avs://openai/official#/components/schemas/CreateChatCompletionRequest` | 那份 spec 里的该 schema |
| `avs://anthropic/bedrock` | overlay + base 合成结果(整份 spec) |
| `avs://gemini/official` | `upstream/gemini/official/discovery.json`(Discovery 格式) |
| `avs://vertex/official` | `upstream/vertex/official/discovery.json` |

resolver 在不同位置自动定位文件(顺序):

1. `AVS_ROOT` 环境变量
2. `cwd` 自身是 ai-vendor-specs 仓库(有 `upstream/` + `scripts/overlay/apply.js`)
3. `cwd/node_modules/ai-vendor-specs`(npm 安装)
4. `cwd/ai-vendor-specs`(git submodule)

## 可用上游

| URI | 格式 | 自动同步 |
|---|---|---|
| `avs://openai/official` | OpenAPI 3.1 (YAML) | ✅ Stainless |
| `avs://openai/azure` | OpenAPI 3.0 (JSON) | ✅ Azure REST API Specs |
| `avs://anthropic/official` | OpenAPI 3.1 (JSON in `.yml`) | ✅ 经由 SDK `.stats.yml` 间接定位 Stainless GCS |
| `avs://anthropic/bedrock` | overlay | 手维护差异声明 |
| `avs://cohere/official` | OpenAPI 3.1 (YAML) | ✅ cohere-developer-experience |
| `avs://gemini/official` | Google Discovery JSON | ✅ Google Discovery API |
| `avs://vertex/official` | Google Discovery JSON | ✅ discovery-artifact-manager |

完整来源见 [SOURCES.md](./SOURCES.md)。

## 典型场景

### 场景 1:网关 build 项目(主要消费方)

`aihubmix-openapi` 用 ai-vendor-specs 作为依赖,合成自己的 `openapi.json`。

核心调用:

```js
const { loadSpec, applyOverlay } = require('ai-vendor-specs');

// 加载 base 骨架
const openaiSpec = loadSpec('avs://openai/official');

// 加载 overlay 派生的 spec(自动 resolve overlay)
const bedrockSpec = loadSpec('avs://anthropic/bedrock');

// 在自己 overlay 文件里写 $ref
// add:
//   cache_control:
//     $ref: "avs://anthropic/official#/components/schemas/CacheControlEphemeral"
// build 时把它内联进网关 spec
```

### 场景 2:契约测试

```js
const { loadSpec } = require('ai-vendor-specs');

const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
// ['id', 'object', 'created', 'model', 'choices']

required.forEach(field => {
  expect(actualResponse[field]).not.toBeUndefined();
});
```

⚠️ 但实际生产应**契约测对 `aihubmix-openapi/openapi.json`** —— 那才是网关真正暴露的 shape。ai-vendor-specs 是上游事实,不是网关契约。

### 场景 3:Discovery → OpenAPI 转换(可选 lab)

Gemini / Vertex 用 Google Discovery 格式。`aihubmix-openapi` 等下游若想用 OpenAPI 工具链处理,可用工具脚本:

```bash
node scripts/convert/discovery-to-openapi.js \
  upstream/gemini/official/discovery.json \
  /tmp/gemini-openapi.yml
```

注:ai-vendor-specs 自身只存原始格式;转换是消费方的选择。

### 场景 4:内部文档站展示上游原貌

内部文档站想展示"OpenAI 的真实 API 长什么样",从 ai-vendor-specs 读文件:

```js
// 文档站后端(已接入 ai-vendor-specs)
const fs = require('fs');
const path = require('path');
const proxySpecsRoot = require.resolve('ai-vendor-specs/package.json').replace('/package.json', '');
const spec = fs.readFileSync(
  path.join(proxySpecsRoot, 'upstream/openai/official/openapi.yml'),
  'utf8'
);
// 用 Redoc / Swagger UI 渲染
```

或文档站 CI 时把 `upstream/` 目录拷贝过去当静态资源服务:

```bash
# 文档站 CI
cp -r ../ai-vendor-specs/upstream ./public/ai-vendor-specs/
# 然后 Redoc 用 spec-url=/ai-vendor-specs/openai/official/openapi.yml
```

> ⚠️ 不用公网 CDN(jsDelivr 等)拉本仓库,本仓库私有,公网拉不到。
> 对外的公开文档展示应基于 `aihubmix-openapi/openapi.json`,不直接基于 ai-vendor-specs。

## 添加新上游

### 有机器可读 spec(走 sync 自动化)

1. 在 `scripts/sync/` 加同步脚本(参考 `openai-official.sh`)
2. 在 `scripts/sync-all.sh` 加调用
3. 跑 `npm run sync` 验证产物
4. 跑 `npm run manifest` 刷顶层索引

### 上游无 spec、但和已有变体只差 envelope(走 overlay)

1. `mkdir upstream/<protocol>/<provider>`
2. 写 `overlay.yml`,声明 `base: avs://...` 和差异(参考 `upstream/anthropic/bedrock/overlay.yml`)
3. 写 `metadata.json`(`kind: overlay`)
4. 跑 `npm run resolve avs://<protocol>/<provider>` 验证 resolve
5. 跑 `npm run manifest` 刷新

### 上游无 spec、无近亲(纯 manual)

1. `mkdir upstream/<protocol>/<provider>`
2. 对照官方文档手工编写 `openapi.yml`(标 `authority: manual`)
3. 写 `metadata.json`(`kind: manual`)
4. 跑 `npm run manifest`

## 相关文档

- [README](../README.md) — 仓库定位、整体引用流程
- [ARCHITECTURE](./ARCHITECTURE.md) — 分层模型、引用协议、metadata schema
- [SOURCES](./SOURCES.md) — 各上游的官方来源 + 同步细节

## License

Internal use only(UNLICENSED)。
