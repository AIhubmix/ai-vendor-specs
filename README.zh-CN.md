# ai-vendor-specs

> 主流 AI 厂商官方 OpenAPI / Discovery 规范的汇集库,每日自动同步上游 + 漂移检测。

**语言**: [English](./README.md) · 简体中文 · [日本語](./README.ja.md)

`ai-vendor-specs` 把各主流 AI 厂商(OpenAI、Anthropic、Cohere、Google、Microsoft,以及一众 OpenAI 兼容厂商)发布的官方 API 规范统一收纳到一处,以一致的数据结构供下游消费:SDK 生成器、网关、文档站、契约测试、IDE 智能提示、AI agent 工具注册表等。

对于没有机器可读 spec 的变体(如 AWS Bedrock 上的 Claude、Groq 等 OpenAI 兼容厂商),用紧凑的 overlay 文件声明差异,在 resolve 阶段合成完整 spec。仓库本身**不存储任何派生产物**,每一个字节都可追溯到上游官方来源。

---

## 当前覆盖

| 协议 | provider | 类型 | 上游来源 |
|---|---|---|---|
| openai | official | spec | Stainless |
| openai | azure | spec | Azure REST API Specs(stable 2024-10-21) |
| openai | azure-preview | spec | Azure REST API Specs(preview 2025-04-01-preview) |
| openai | deepseek | overlay | api-docs.deepseek.com |
| openai | groq | overlay | console.groq.com/docs |
| openai | together | overlay | docs.together.ai |
| openai | xai | overlay | docs.x.ai |
| anthropic | official | spec | Anthropic SDK `.stats.yml` → Stainless |
| anthropic | bedrock | overlay | AWS Bedrock 文档 |
| cohere | official | spec | cohere-developer-experience |
| gemini | official | spec | Google Discovery(`generativelanguage.googleapis.com`) |
| vertex | official | spec | Google Discovery(`aiplatform.googleapis.com`) |

完整上游 URL、同步方式和版本钉死细节见 [`docs/SOURCES.md`](./docs/SOURCES.md)。

---

## 安装

### npm

```bash
npm install @aihubmix/ai-vendor-specs
```

### git submodule

```bash
git submodule add https://github.com/AIhubmix/ai-vendor-specs.git ai-vendor-specs
git submodule update --init --remote ai-vendor-specs
```

### 直接下载(无需运行时)

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/upstream/openai/official/openapi.yml
```

---

## 使用

### 加载任意上游 spec

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

// spec 类条目:直接读文件
const openai = loadSpec('avs://openai/official');

// overlay 类条目:自动合成 base + overlay
const bedrock = loadSpec('avs://anthropic/bedrock');
const xai     = loadSpec('avs://openai/xai');

// 通过 JSON Pointer 取具体 schema
const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

### 发现可用上游

```js
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

for (const [key, entry] of Object.entries(manifest.upstream)) {
  console.log(key, entry.kind, entry.rawUrl);
}
```

或不通过运行时直接拉:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

---

## `avs://` URI 协议

所有上游引用统一使用同一套 URI:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

| 示例 | 解析为 |
|---|---|
| `avs://openai/official` | OpenAI 整份 OpenAPI spec |
| `avs://anthropic/bedrock` | Bedrock 合成后的完整 spec(base + overlay) |
| `avs://anthropic/official#/components/schemas/Message` | Anthropic spec 里某个 schema |
| `avs://gemini/official` | Gemini 的 Google Discovery 文档 |

Resolver 按以下顺序定位数据根目录:

1. 环境变量 `AVS_ROOT`(显式覆盖)
2. 当前工作目录(在仓库自身内运行时)
3. `node_modules/@aihubmix/ai-vendor-specs/`(npm 安装)
4. 同级 `ai-vendor-specs/` 目录(git submodule)

写 overlay 或消费方代码时无需关心当前在哪一种部署模式下。

---

## 文档

| 文档 | 读者 | 内容 |
|---|---|---|
| [架构设计](./docs/ARCHITECTURE.md) | 所有人 | 设计、kind 分类、metadata schema、overlay 语法 |
| [使用指南](./docs/USAGE.md) | 消费方 | 接入方式、典型场景 |
| [上游来源](./docs/SOURCES.md) | 审计者 | 各厂商上游 URL 和同步方式 |
| [贡献指南](./CONTRIBUTING.md) | 贡献者 | 加新厂商、本地开发、drift、webhook |

---

## License

MIT
