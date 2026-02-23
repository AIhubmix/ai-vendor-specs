# Playground 项目集成指南

## 定位

`openai/official/openapi.yml` 是 playground UI 的**参数定义源**。

从 spec 读取参数列表、类型、约束、枚举值和描述，驱动表单自动生成。OpenAI 新增参数时，playground 下次构建自动出现新控件，无需手动改代码。

---

## 核心 Schema

playground 主要使用两个 schema：

- `CreateChatCompletionRequest` — 所有请求参数定义
- `CreateChatCompletionResponse` — 响应结构定义（用于结果展示）

```javascript
const spec = yaml.load(fs.readFileSync('openai/official/openapi.yml', 'utf8'));
const requestSchema = spec.components.schemas.CreateChatCompletionRequest;
const responseSchema = spec.components.schemas.CreateChatCompletionResponse;
```

---

## 引入方式

### 方式一：构建时嵌入（推荐）

构建脚本从 spec 提取参数配置，生成 JSON 文件供 playground 使用：

```javascript
// scripts/generate-params.js
const yaml = require('js-yaml');
const fs = require('fs');

const spec = yaml.load(
  fs.readFileSync('node_modules/proxy-specs/openai/official/openapi.yml', 'utf8')
);

const requestSchema = spec.components.schemas.CreateChatCompletionRequest;

// 提取每个参数的控件配置
const params = Object.entries(requestSchema.properties || {}).map(([name, prop]) => ({
  name,
  type: prop.type,
  description: prop.description || '',
  required: (requestSchema.required || []).includes(name),
  // 数值类型的约束
  minimum: prop.minimum,
  maximum: prop.maximum,
  default: prop.default,
  // 枚举类型
  enum: prop.enum,
  // 嵌套对象
  $ref: prop.$ref,
}));

fs.writeFileSync(
  'src/params-schema.json',
  JSON.stringify(params, null, 2)
);

console.log(`✅ 生成 ${params.length} 个参数配置`);
```

在 `package.json` 中注册为构建步骤：

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-params.js",
    "build": "vite build"
  }
}
```

### 方式二：运行时直接引用

适合需要实时感知 spec 变更的场景：

```javascript
// src/hooks/useParamsSchema.js
import yaml from 'js-yaml';

let cachedSpec = null;

export async function loadParamsSchema() {
  if (cachedSpec) return cachedSpec;

  const text = await fetch('/specs/openai/official/openapi.yml').then(r => r.text());
  const spec = yaml.load(text);
  cachedSpec = spec.components.schemas.CreateChatCompletionRequest;
  return cachedSpec;
}
```

---

## 表单控件映射

根据 spec 中的参数类型和约束，映射到对应的 UI 控件：

| spec 属性 | 控件类型 | 说明 |
|-----------|---------|------|
| `type: number` + `minimum`/`maximum` | Slider | 范围从 spec 读取 |
| `type: integer` + `minimum`/`maximum` | NumberInput | 整数步进 |
| `type: string` + `enum` | Select | 选项从 spec 读取 |
| `type: boolean` | Toggle | |
| `type: string`（无枚举） | TextInput | |
| `type: array` + `items` | TagInput / MultiSelect | |
| `$ref` | 嵌套表单组 | 递归展开 |

### React 示例

```tsx
// src/components/ParamField.tsx
import React from 'react';

interface ParamConfig {
  name: string;
  type: string;
  description: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  enum?: string[];
  required: boolean;
}

export function ParamField({ param, value, onChange }: {
  param: ParamConfig;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}) {
  // 枚举 → Select
  if (param.enum) {
    return (
      <div title={param.description}>
        <label>{param.name}</label>
        <select value={String(value ?? '')} onChange={e => onChange(param.name, e.target.value)}>
          {param.enum.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  // 数值 + 范围 → Slider
  if (param.type === 'number' && param.minimum !== undefined && param.maximum !== undefined) {
    return (
      <div title={param.description}>
        <label>{param.name}: {value ?? param.default}</label>
        <input
          type="range"
          min={param.minimum}
          max={param.maximum}
          step={0.01}
          value={Number(value ?? param.default ?? param.minimum)}
          onChange={e => onChange(param.name, parseFloat(e.target.value))}
        />
      </div>
    );
  }

  // 整数
  if (param.type === 'integer') {
    return (
      <div title={param.description}>
        <label>{param.name}</label>
        <input
          type="number"
          min={param.minimum}
          max={param.maximum}
          value={Number(value ?? param.default ?? '')}
          onChange={e => onChange(param.name, parseInt(e.target.value, 10))}
        />
      </div>
    );
  }

  // 布尔 → Toggle
  if (param.type === 'boolean') {
    return (
      <div title={param.description}>
        <label>{param.name}</label>
        <input
          type="checkbox"
          checked={Boolean(value ?? param.default)}
          onChange={e => onChange(param.name, e.target.checked)}
        />
      </div>
    );
  }

  // 默认 → TextInput
  return (
    <div title={param.description}>
      <label>{param.name}</label>
      <input
        type="text"
        value={String(value ?? param.default ?? '')}
        onChange={e => onChange(param.name, e.target.value)}
      />
    </div>
  );
}
```

### 表单主体

```tsx
// src/components/ParamForm.tsx
import React, { useState, useEffect } from 'react';
import paramsSchema from '../params-schema.json';
import { ParamField } from './ParamField';

// 只展示主要参数，隐藏 messages 等结构复杂的字段
const VISIBLE_PARAMS = [
  'model', 'temperature', 'max_tokens', 'top_p',
  'frequency_penalty', 'presence_penalty', 'stream',
  'response_format', 'seed', 'reasoning_effort'
];

export function ParamForm({ onSubmit }: { onSubmit: (params: Record<string, unknown>) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  const visibleParams = paramsSchema.filter(p => VISIBLE_PARAMS.includes(p.name));

  function handleChange(name: string, value: unknown) {
    setValues(prev => ({ ...prev, [name]: value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(values); }}>
      {visibleParams.map(param => (
        <ParamField
          key={param.name}
          param={param}
          value={values[param.name]}
          onChange={handleChange}
        />
      ))}
      <button type="submit">发送</button>
    </form>
  );
}
```

---

## 新参数自动感知

当 OpenAI 发布新参数（如 `reasoning_effort`）时：

1. proxy-specs 每日 sync 自动拉取最新 spec
2. `npm update proxy-specs` 获取更新
3. `npm run prebuild` 重新生成 `params-schema.json`
4. 若新参数在 `VISIBLE_PARAMS` 列表中，自动出现表单控件

**无需改动任何 UI 组件代码。**

对于复杂类型参数（如 `tools`、`response_format`），需手动添加到 `VISIBLE_PARAMS` 并在 `ParamField` 中处理对应控件逻辑。

---

## 推荐目录结构

```
playground/
  scripts/
    generate-params.js      # 从 proxy-specs spec 提取参数配置
  src/
    params-schema.json      # 生成产物（由 prebuild 脚本维护，不手动编辑）
    components/
      ParamForm.tsx         # 读取 params-schema.json 渲染表单
      ParamField.tsx        # 单个参数控件，按类型分发
    hooks/
      useChat.ts            # 调用 one-api chat 接口
  package.json              # prebuild: node scripts/generate-params.js
```

---

## 参数描述内联展示

spec 中每个参数都有 `description` 字段，直接用作 tooltip 或 help text：

```tsx
// description 来自 spec，无需单独维护文档
<div className="param-help" title={param.description}>
  <QuestionMarkIcon />
</div>
```

这样当 OpenAI 更新参数说明时，playground 的提示文字也会同步更新。

---

## 注意事项

1. **`params-schema.json` 不应手动编辑**，它是 spec 的派生产物。如需自定义展示逻辑，在 `ParamField` 组件中处理，而不是修改 JSON 文件。

2. **`VISIBLE_PARAMS` 白名单** 需要在 spec 更新后人工 review 是否有新参数值得展示，避免表单被 spec 中所有字段（包括内部字段）淹没。

3. **构建时嵌入 vs 运行时引用**：生产环境优先选构建时嵌入，减少运行时依赖。开发环境可用运行时引用实时感知 spec 变更。
