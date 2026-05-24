# ai-vendor-specs 使用指南

> 上游 AI 协议 spec 收集库。本指南面向**消费方**——任何想直接读取上游 spec 的项目:网关 / proxy、SDK 生成器、文档站、契约测试、IDE 智能提示、AI agent 工具注册表等。

## 接入方式

### 方式 A:npm(推荐)

```bash
npm install @aihubmix/ai-vendor-specs
```

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');
const openai = loadSpec('avs://openai/official');
```

### 方式 B:git submodule

适合 CI 不能装 npm 包,或希望钉死某个 commit 的场景:

```bash
git submodule add https://github.com/AIhubmix/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs
```

resolver 自动识别同级 `./ai-vendor-specs/` 路径,也可以通过环境变量显式定位:

```bash
AVS_ROOT=./ai-vendor-specs node your-script.js
```

### 方式 C:`file:` 依赖(同级开发场景)

```jsonc
// consumer/package.json
{
  "dependencies": {
    "@aihubmix/ai-vendor-specs": "file:../ai-vendor-specs"
  }
}
```

```bash
npm install   # 创建 node_modules/@aihubmix/ai-vendor-specs 指向 ../ai-vendor-specs 的 symlink
```

改 ai-vendor-specs 内容**立即生效**(symlink,不用 reinstall)。

### 方式 D:不要运行时,纯 HTTP 拉取

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/upstream/openai/official/openapi.yml

# manifest 入口
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

### 接入后:统一的 loadSpec API

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');

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
| `avs://openai/xai` | overlay + openai/official 合成结果 |
| `avs://gemini/official` | `upstream/gemini/official/discovery.json`(Discovery 格式) |
| `avs://vertex/official` | `upstream/vertex/official/discovery.json` |

resolver 在不同位置自动定位文件(顺序):

1. `AVS_ROOT` 环境变量
2. `cwd` 自身是 ai-vendor-specs 仓库(有 `upstream/` + `scripts/overlay/apply.js`)
3. `cwd/node_modules/@aihubmix/ai-vendor-specs`(npm 安装)
4. `cwd/ai-vendor-specs`(git submodule)

## 可用上游

| URI | 格式 | 自动同步 |
|---|---|---|
| `avs://openai/official` | OpenAPI 3.1 (YAML) | ✅ Stainless |
| `avs://openai/azure` | OpenAPI 3.0 (JSON) | ✅ Azure REST API Specs |
| `avs://openai/azure-preview` | OpenAPI 3.1 (JSON) | ✅ Azure REST API Specs preview |
| `avs://openai/deepseek` | overlay | 手维护差异声明 |
| `avs://openai/groq` | overlay | 手维护差异声明 |
| `avs://openai/together` | overlay | 手维护差异声明 |
| `avs://openai/xai` | overlay | 手维护差异声明 |
| `avs://anthropic/official` | OpenAPI 3.1 | ✅ 经由 SDK `.stats.yml` 间接定位 Stainless GCS |
| `avs://anthropic/bedrock` | overlay | 手维护差异声明 |
| `avs://cohere/official` | OpenAPI 3.1 (YAML) | ✅ cohere-developer-experience |
| `avs://gemini/official` | Google Discovery JSON | ✅ Google Discovery API |
| `avs://vertex/official` | Google Discovery JSON | ✅ discovery-artifact-manager |

完整来源见 [SOURCES.md](./SOURCES.md)。

## 典型场景

### 场景 1:网关 / proxy 编译最终 spec

把 ai-vendor-specs 作为依赖,合成网关自家的对外 spec:

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');

// 加载 base 骨架
const openaiSpec = loadSpec('avs://openai/official');

// 加载 overlay 派生的 spec
const bedrockSpec = loadSpec('avs://anthropic/bedrock');

// 在自家 overlay 里写 $ref:
//   add:
//     cache_control:
//       $ref: "avs://anthropic/official#/components/schemas/CacheControlEphemeral"
// build 时把它内联进网关 spec
```

### 场景 2:SDK 生成器 / 类型生成

从上游 spec 直接生成 TypeScript 类型 / Python typed-dict / Go struct:

```bash
# 用 openapi-typescript 生成 TS 类型
npx openapi-typescript \
  node_modules/@aihubmix/ai-vendor-specs/upstream/openai/official/openapi.yml \
  -o src/types/openai.d.ts
```

每日 sync 后类型自动跟新,SDK 不会落后于上游。

### 场景 3:契约测试

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
// ['id', 'object', 'created', 'model', 'choices']

required.forEach(field => {
  expect(actualResponse[field]).not.toBeUndefined();
});
```

适合"想知道上游真正承诺了什么字段"的契约测试场景。若你测的是某个网关 proxy 出来的响应,要测对网关自身公布的 spec,不是上游 spec。

### 场景 4:Discovery → OpenAPI 转换(可选)

Gemini / Vertex 用 Google Discovery 格式。下游若想用 OpenAPI 工具链处理,可借助 [gnostic](https://github.com/google/gnostic):

```bash
gnostic upstream/gemini/official/discovery.json \
  --openapi-out=upstream/gemini/official/openapi.yml
```

注:ai-vendor-specs 自身只存原始格式;转换是消费方的选择。

### 场景 5:文档站展示上游原貌

```js
const fs = require('fs');
const path = require('path');
const specsRoot = require.resolve('@aihubmix/ai-vendor-specs/package.json').replace('/package.json', '');
const spec = fs.readFileSync(
  path.join(specsRoot, 'upstream/openai/official/openapi.yml'),
  'utf8'
);
// 用 Redoc / Swagger UI 渲染
```

或在 CI 构建时把 `upstream/` 目录拷过去当静态资源:

```bash
cp -r node_modules/@aihubmix/ai-vendor-specs/upstream ./public/specs/
# 然后 Redoc 用 spec-url=/specs/openai/official/openapi.yml
```

### 场景 6:AI agent 工具注册表

AI agent 框架(LangChain / 函数调用 / MCP server 等)需要"工具描述"作为模型上下文。直接用上游 OpenAPI 作为工具元数据来源:

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

## 添加新上游

详见 [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-new-vendor)。

## 相关文档

- [README](../README.md) — 项目概述
- [ARCHITECTURE](./ARCHITECTURE.md) — 设计、kind 分类、metadata schema、overlay 语法
- [SOURCES](./SOURCES.md) — 各上游官方来源 + 同步细节
- [CONTRIBUTING](../CONTRIBUTING.md) — 加新厂商、本地开发、drift、webhook

## License

MIT
