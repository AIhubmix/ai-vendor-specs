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

完整上游 URL、同步方式和版本钉死细节见 [`docs/SOURCES.md`](./docs/SOURCES.zh-CN.md)。

---

## 工作机制

ai-vendor-specs 是一层薄薄的数据层,职责单一:保存每个上游 AI 厂商 API 真相的机器可读拷贝(可审计、可追溯),用统一的 URI 协议对外暴露。

```
┌─── 12+ 个上游厂商 ────────────────────────────────────────────┐
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google /        │
│   xAI / DeepSeek / Groq / Together / AWS Bedrock               │
└────────────────────────────┬──────────────────────────────────┘
                             │ 每日 cron 同步(机器可读 spec)
                             │ overlay 文件声明差异(无 spec 的)
                             ▼
┌─── ai-vendor-specs(本仓库)────────────────────────────────────┐
│                                                                │
│   upstream/<protocol>/<provider>/                              │
│     openapi.{yml,json} | discovery.json     ← spec(自动同步)  │
│     overlay.yml                              ← overlay(手维护)│
│                                                                │
│   manifest.json   ← 所有条目的发现入口                          │
│   resolver lib    ← 把 base + overlay 合成完整 spec             │
│   drift detector  ← 上游版本变动 / overlay 过期 / 同步失败时报警│
└────────────────────────────┬──────────────────────────────────┘
                             │ npm / PyPI / submodule / raw / CDN
                             ▼
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  SDK 生成器              网关 / proxy           文档站
  契约测试                AI agent 工具          IDE 智能提示
```

### 这个仓库做什么

- ✅ 每日自动同步每个上游的机器可读 OpenAPI / Discovery 规范,hash 跟踪
- ✅ 对没有公开机器可读 spec 的上游(AWS Bedrock、OpenAI 兼容厂商:xAI / DeepSeek / Groq / Together 等),用 overlay 文件声明差异
- ✅ 维护顶层 `manifest.json` 作为所有消费方的发现入口
- ✅ 漂移检测——版本变动、overlay 过期、同步失败——在消费方踩坑前预警

### 这个仓库**不**做什么

- ❌ 生成派生产物(合成 spec、SDK、契约 fixture)——那是消费方自己的选择
- ❌ 记录消费方业务字段——数据保持中性的上游真相

判断口诀:**"这描述的是上游真实存在的东西吗?"** 是 → 放这里。否 → 放消费方。

架构细节(kind 分类、overlay 语法、metadata schema)见 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.zh-CN.md)。

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

### pip

```bash
pip install ai-vendor-specs
```

Python 包共享同一份上游数据,提供只读 API。overlay 合成目前仅 JavaScript 版可用;详见下方 [Python 使用](#python-1)。

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

### Python

```python
import ai_vendor_specs as avs

# 厂商目录
manifest = avs.load_manifest()
for vendor in avs.list_vendors():
    print(vendor['key'], vendor['kind'])

# 单条查询
xai = avs.get_vendor('openai', 'xai')

# 原始 spec 文件路径(overlay 类条目返回 overlay.yml,
# 合成需要 JavaScript 版 resolver,Python 合成器在路线图)
spec_path = avs.load_spec_path('openai', 'official')
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
| [架构设计](./docs/ARCHITECTURE.zh-CN.md) | 所有人 | 设计、kind 分类、metadata schema、overlay 语法 |
| [使用指南](./docs/USAGE.zh-CN.md) | 消费方 | 接入方式、典型场景 |
| [上游来源](./docs/SOURCES.zh-CN.md) | 审计者 | 各厂商上游 URL 和同步方式 |
| [贡献指南](./CONTRIBUTING.md) | 贡献者 | 加新厂商、本地开发、drift、webhook |

---

## License

MIT
