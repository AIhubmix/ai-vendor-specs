# proxy-specs

> 存储和同步各主流 AI 协议的原始 API 规范，作为下游工具的权威标准来源

## 定位

proxy-specs 是一个**规范存储与同步库**，不包含业务逻辑。

它解决的核心问题：当你开发一个 AI 代理服务（如 [one-api](https://github.com/songquanpeng/one-api)）的测试工具或 UI，需要知道"OpenAI API 的响应 schema 是什么"、"chat 请求有哪些参数及其约束"——这些信息不应硬编码在代码里，而应从权威来源动态读取。

```
proxy-specs (权威规范源)
       │
       ├── openai/official/openapi.yml
       │         │
       │         ├──► 自动化测试项目
       │         │      契约测试：验证 one-api 响应符合 OpenAI 标准
       │         │      spec 更新 → hash 变更 → CI 感知 → 人工 review
       │         │
       │         └──► Playground 项目
       │                Schema 驱动参数表单：无需硬编码参数列表
       │                新参数 → spec 更新 → 构建时自动生成新控件
       │
       └── gemini/official/, anthropic/official/, ...
             记录各协议原生规范，供参考和文档用途
```

---

## 支持的协议

| 目录 | 协议 | Tier | 同步方式 |
|------|------|------|---------|
| `openai/official/` | OpenAI 官方 | 1 | 自动，每日从 Stainless 同步 |
| `openai/azure/` | Azure OpenAI | 1 | 自动，每日从 Azure REST API Specs 同步 |
| `cohere/official/` | Cohere 原生 | 1 | 自动，每日从 cohere-typescript 同步 |
| `gemini/official/` | Google Gemini 原生（AI Studio） | 2 | 自动，Discovery JSON 直接存储 |
| `vertex/official/` | Google Vertex AI 原生 | 2 | 自动，Discovery JSON 直接存储 |
| `anthropic/official/` | Anthropic Claude 直连 | 3 | 手动维护 |
| `anthropic/bedrock/` | Claude on AWS Bedrock | 3 | 手动维护 |

**关于目录结构**：顶层是协议名，而不是厂商名。这是因为 proxy 服务按协议路由——`openai/azure/` 归入 `openai/` 协议是因为 Azure 的 request body 与 OpenAI 完全相同，只是 URL 和认证头不同；`anthropic/bedrock/` 归入 `anthropic/` 是因为 Bedrock Claude 的请求体格式与 Anthropic 直连 API 几乎相同（仅多一个 `anthropic_version` 字段）；而 `gemini/`、`cohere/` 使用完全不同的请求/响应结构，各自独立协议目录。

---

## 快速开始

### 同步规范

```bash
npm install
npm run sync        # 同步 Tier 1 + Tier 2（自动同步协议）
bash scripts/validate-all.sh
```

### 在项目中使用

```bash
# git submodule
git submodule add https://github.com/your-org/proxy-specs.git vendor-specs

# 或 npm
npm install proxy-specs
```

```javascript
const yaml = require('js-yaml');
const fs = require('fs');

const spec = yaml.load(
  fs.readFileSync('vendor-specs/openai/official/openapi.yml', 'utf8')
);

// 读取 chat 请求 schema
const requestSchema = spec.components.schemas.CreateChatCompletionRequest;
// 读取 chat 响应 schema
const responseSchema = spec.components.schemas.CreateChatCompletionResponse;
```

---

## 为什么需要这个仓库

### 背景

AI 代理服务（如 one-api）对外统一暴露 OpenAI 格式接口，内部将请求转换为各厂商原生协议后调用上游 API。适配器层的转换逻辑是**硬编码的 Go 代码**，不依赖外部规范文件——Gemini 适配器中有约 76 处硬编码转换逻辑，Cohere 适配器将 `messages[]` 转换为 `message + chat_history[]`，这些都无法从规范自动推导。

但在测试和 UI 开发层面，规范文件有明确价值：

### 价值 1：契约测试

`openai/official/openapi.yml` 定义了 one-api 对外的接口契约。测试项目以此为标准，无需手动维护期望字段列表：

```javascript
// 从 spec 读取 required 字段，自动生成断言
const required = spec.components.schemas.CreateChatCompletionResponse.required;
// → ['id', 'object', 'created', 'model', 'choices']

required.forEach(field => {
  expect(oneApiResponse[field]).not.toBeUndefined();
});

// 从 spec 读取枚举值，验证合规性
const finishReasonEnum = choiceSchema.properties.finish_reason.enum;
expect(finishReasonEnum).toContain(response.choices[0].finish_reason);
```

### 价值 2：Schema 驱动 UI

Playground 无需硬编码参数列表，直接从 spec 读取参数定义驱动表单：

```javascript
const properties = spec.components.schemas.CreateChatCompletionRequest.properties;

// temperature: { type: 'number', minimum: 0, maximum: 2 }
// → 自动渲染 Slider，范围从 spec 读取

// response_format.type: { enum: ['text', 'json_object', 'json_schema'] }
// → 自动渲染 Select，选项从 spec 读取
```

OpenAI 新增参数（如 `reasoning_effort`）→ spec 每日自动更新 → Playground 下次构建自动出现新控件。

### 价值 3：API 变更感知

`metadata.json` 中的 `hash` 字段记录每次 sync 后规范文件的 sha256。CI 检测到 hash 变化时触发通知，团队可 review OpenAI 的接口变更，决定是否需要更新测试或业务逻辑。

---

## 分层说明

- **Tier 1**（openai/official, openai/azure, cohere/official）：厂商提供完整 OpenAPI 规范，直接下载，完全自动同步
- **Tier 2**（gemini/official, vertex/official）：厂商使用 Google Discovery 格式，Discovery JSON 即原生规范，直接存储，自动同步
- **Tier 3**（anthropic/official, anthropic/bedrock）：无机器可读规范源，依据官方文档手动编写，`autoSync: false`

---

## 文档

- [架构设计](./docs/ARCHITECTURE.md) — 目录结构、分层设计、同步流程、与 one-api 的关系
- [使用指南](./docs/USAGE.md) — 集成方式、加载规范、典型场景代码示例
- [自动化测试集成](./docs/TESTING-INTEGRATION.md) — 契约测试：schema 校验、必填字段、枚举值验证、变更感知
- [Playground 集成](./docs/PLAYGROUND-INTEGRATION.md) — Schema 驱动表单：控件映射、约束校验、参数描述内联

---

## 许可证

MIT
