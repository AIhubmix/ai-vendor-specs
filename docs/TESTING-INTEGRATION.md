# 自动化测试项目集成指南

## 定位

`openai/official/openapi.yml` 是 one-api chat 接口的**契约文件**。

测试项目以此 spec 为标准，验证 one-api 的入参合法性和响应合规性。不需要手动维护期望字段列表——spec 本身就是最新的权威定义。

---

## 引入方式

### 方式一：npm 包（推荐）

```bash
npm install proxy-specs
```

```javascript
const yaml = require('js-yaml');
const fs = require('fs');

// 加载 OpenAI 官方规范
const spec = yaml.load(
  fs.readFileSync('node_modules/proxy-specs/openai/official/openapi.yml', 'utf8')
);
```

### 方式二：git submodule

```bash
git submodule add https://github.com/your-org/proxy-specs.git specs
git submodule update --init
```

```javascript
const spec = yaml.load(fs.readFileSync('specs/openai/official/openapi.yml', 'utf8'));
```

---

## 核心用法

### A. 响应 Schema 校验

从 spec 提取 `CreateChatCompletionResponse` schema，使用 ajv 验证 one-api 的每条响应：

```javascript
const Ajv = require('ajv');
const yaml = require('js-yaml');
const fs = require('fs');

const spec = yaml.load(fs.readFileSync('openai/official/openapi.yml', 'utf8'));
const ajv = new Ajv({ strict: false });

// 注册所有 components/schemas
Object.entries(spec.components.schemas).forEach(([name, schema]) => {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
});

const responseSchema = spec.components.schemas.CreateChatCompletionResponse;
const validate = ajv.compile(responseSchema);

// 在测试中使用
function assertValidChatResponse(oneApiResponse) {
  const valid = validate(oneApiResponse);
  if (!valid) {
    throw new Error(`Response schema violation: ${JSON.stringify(validate.errors, null, 2)}`);
  }
}
```

### B. 必填字段覆盖测试

从 spec 读取 `required` 字段列表，自动生成断言：

```javascript
const responseSchema = spec.components.schemas.CreateChatCompletionResponse;

// spec 中 required: [id, object, created, model, choices]
// 自动生成：每个必填字段都必须存在且非 null
describe('必填字段', () => {
  const requiredFields = responseSchema.required || [];

  requiredFields.forEach(field => {
    it(`响应应包含必填字段: ${field}`, async () => {
      const response = await callOneApi({ model: 'gpt-4o', messages: [...] });
      expect(response[field]).not.toBeUndefined();
      expect(response[field]).not.toBeNull();
    });
  });
});
```

### C. 枚举值合规测试

```javascript
// 从 spec 读取 finish_reason 枚举值
// enum: [stop, length, content_filter, tool_calls, function_call]
const choiceSchema = spec.components.schemas.CreateChatCompletionResponse
  .properties.choices.items;
const finishReasonEnum = choiceSchema.properties.finish_reason.enum;

it('finish_reason 应为 spec 定义的合法值', async () => {
  const response = await callOneApi({ model: 'gpt-4o', messages: [...] });
  response.choices.forEach(choice => {
    expect(finishReasonEnum).toContain(choice.finish_reason);
  });
});
```

### D. 请求参数边界测试

从 spec 读取参数约束，自动生成边界测试：

```javascript
const requestSchema = spec.components.schemas.CreateChatCompletionRequest;

// temperature: { type: number, minimum: 0, maximum: 2 }
const tempSchema = requestSchema.properties.temperature;

it('temperature 超出范围应返回 400', async () => {
  const res = await callOneApi({
    model: 'gpt-4o',
    messages: [...],
    temperature: tempSchema.maximum + 1  // 从 spec 读取上限
  });
  expect(res.status).toBe(400);
});
```

### E. spec 变更自动感知

每日 sync 后若 `metadata.json` 中 hash 变化，CI 自动触发通知：

```javascript
// ci/check-spec-change.js
const metadata = require('proxy-specs/openai/official/metadata.json');
const lastKnownHash = require('./last-known-hash.json');

if (metadata.hash !== lastKnownHash.openaiOfficial) {
  console.log('⚠️  OpenAI spec 已更新，请检查以下内容：');
  console.log('  1. 是否有新增必填字段');
  console.log('  2. 是否有枚举值变化');
  console.log('  3. 是否有新增/废弃的端点');

  // 更新已知 hash
  fs.writeFileSync('./last-known-hash.json', JSON.stringify({
    openaiOfficial: metadata.hash,
    updatedAt: new Date().toISOString()
  }));

  process.exit(1); // 触发 CI 失败，人工确认
}
```

---

## 推荐目录结构

```
auto-tests/
  lib/
    spec-loader.js        # 读取 proxy-specs 的工具函数
    schema-validator.js   # 基于 spec schema 的校验器
    spec-watcher.js       # 检测 spec hash 变更
  tests/
    contract/             # 契约测试（从 spec 自动生成断言）
      chat-response.test.js
      required-fields.test.js
      enum-values.test.js
    regression/           # 回归测试（手写，覆盖 spec 未覆盖的边界）
      streaming.test.js
      error-handling.test.js
  ci/
    check-spec-change.js  # CI 中检测 spec 变更
    last-known-hash.json  # 上次确认的 hash（提交到 git）
```

### spec-loader.js 示例

```javascript
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const SPEC_BASE = path.resolve(__dirname, '../../node_modules/proxy-specs');

function loadSpec(protocol, provider = 'official') {
  const specPath = path.join(SPEC_BASE, protocol, provider, 'openapi.yml');
  return yaml.load(fs.readFileSync(specPath, 'utf8'));
}

function getSchema(spec, schemaName) {
  return spec.components?.schemas?.[schemaName];
}

function getRequestSchema(spec, operationId) {
  // 遍历 paths 找到对应 operation
  for (const [, pathItem] of Object.entries(spec.paths || {})) {
    for (const [, operation] of Object.entries(pathItem)) {
      if (operation.operationId === operationId) {
        const ref = operation.requestBody?.content?.['application/json']?.schema?.$ref;
        if (ref) {
          const schemaName = ref.split('/').pop();
          return getSchema(spec, schemaName);
        }
      }
    }
  }
  return null;
}

module.exports = { loadSpec, getSchema, getRequestSchema };
```

---

## 与 CI/CD 集成

### GitHub Actions 示例

```yaml
# .github/workflows/contract-test.yml
name: Contract Tests

on:
  schedule:
    - cron: '0 8 * * *'  # 每日运行
  push:
    branches: [main]

jobs:
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: 更新 proxy-specs
        run: npm update proxy-specs

      - name: 检查 spec 变更
        run: node ci/check-spec-change.js
        continue-on-error: true  # 变更时记录但不阻断

      - name: 运行契约测试
        run: npm test tests/contract/

      - name: 运行回归测试
        run: npm test tests/regression/
```

---

## 注意事项

1. **spec 是 one-api 入参和出参的标准**，不是 one-api 内部实现的标准。one-api 底层调用各厂商原生 API，但对外始终遵循 OpenAI spec。

2. **契约测试应覆盖 spec 中所有 required 字段**，回归测试负责覆盖 spec 未描述的运行时行为（如超时、并发、流式传输）。

3. **hash 变更时不要立即更新测试**，应先人工 review 变更内容，确认 one-api 已支持新字段后再更新测试和 hash 记录。
