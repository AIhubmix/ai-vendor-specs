# proxy-specs 使用指南

## 快速开始

### 集成到项目

#### 方式 A: Git Submodule（推荐）

```bash
git submodule add https://github.com/your-org/proxy-specs.git vendor-specs
git submodule update --init

# 更新到最新版本
git submodule update --remote vendor-specs
```

#### 方式 B: NPM 包

```bash
npm install proxy-specs
```

---

## 可用规范

| 路径 | 格式 | Tier | 说明 |
|------|------|------|------|
| `openai/official/openapi.yml` | OpenAPI 3.1 | 1 | OpenAI 官方，每日自动同步 |
| `openai/azure/openapi.json` | OpenAPI 3.0 | 1 | Azure OpenAI，每日自动同步 |
| `cohere/official/openapi.yml` | OpenAPI 3.0 | 1 | Cohere 原生协议，每日自动同步 |
| `gemini/official/openapi.yml` | OpenAPI 3.0 | 2 | Google Gemini，Discovery 转换 |
| `gemini/official/discovery.json` | Discovery | 2 | Google Gemini 原始格式 |
| `vertex/official/openapi.yml` | OpenAPI 3.0 | 2 | Google Vertex AI，Discovery 转换 |
| `vertex/official/discovery.json` | Discovery | 2 | Google Vertex AI 原始格式 |
| `anthropic/official/openapi.yml` | OpenAPI 3.0 | 3 | Anthropic Claude，手动维护 |

---

## 加载规范

### JavaScript/TypeScript

```javascript
const fs = require('fs');
const yaml = require('js-yaml');

function loadSpec(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return filePath.endsWith('.json')
        ? JSON.parse(content)
        : yaml.load(content);
}

// OpenAI 官方（最常用）
const openaiSpec = loadSpec('vendor-specs/openai/official/openapi.yml');

// Azure OpenAI
const azureSpec = loadSpec('vendor-specs/openai/azure/openapi.json');

// Cohere 原生协议
const cohereSpec = loadSpec('vendor-specs/cohere/official/openapi.yml');

// Google Gemini（转换后）
const geminiSpec = loadSpec('vendor-specs/gemini/official/openapi.yml');

// Anthropic（手动维护，注意可能滞后于官方文档）
const anthropicSpec = loadSpec('vendor-specs/anthropic/official/openapi.yml');
```

### Python

```python
import yaml
import json
from pathlib import Path

def load_spec(path):
    p = Path(path)
    content = p.read_text()
    return json.loads(content) if p.suffix == '.json' else yaml.safe_load(content)

openai_spec = load_spec('vendor-specs/openai/official/openapi.yml')
gemini_spec = load_spec('vendor-specs/gemini/official/openapi.yml')
```

### Go

```go
import (
    "os"
    "gopkg.in/yaml.v3"
)

func loadSpec(path string) (map[string]interface{}, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    var spec map[string]interface{}
    return spec, yaml.Unmarshal(data, &spec)
}

spec, _ := loadSpec("vendor-specs/openai/official/openapi.yml")
```

---

## 读取元数据

```javascript
const metadata = require('vendor-specs/openai/official/metadata.json');

console.log(metadata.displayName);  // "OpenAI Official"
console.log(metadata.lastSynced);   // "2026-02-23T13:39:24Z"
console.log(metadata.hash);         // "sha256:3db95073..."
console.log(metadata.autoSync);     // true
```

---

## 主要使用场景

### 场景 1: 契约测试（自动化测试项目）

以 `openai/official/openapi.yml` 为契约，验证 one-api 的响应合规性：

```javascript
const Ajv = require('ajv');
const spec = yaml.load(fs.readFileSync('vendor-specs/openai/official/openapi.yml', 'utf8'));

const responseSchema = spec.components.schemas.CreateChatCompletionResponse;
const validate = new Ajv({ strict: false }).compile(responseSchema);

// 在测试中
const valid = validate(oneApiResponse);
assert(valid, JSON.stringify(validate.errors));
```

### 场景 2: Schema 驱动 UI（Playground 项目）

从 spec 提取参数定义，自动渲染参数表单：

```javascript
const requestSchema = spec.components.schemas.CreateChatCompletionRequest;

// temperature: { type: 'number', minimum: 0, maximum: 2 }
// → 渲染 Slider，范围从 spec 读取，无需硬编码

Object.entries(requestSchema.properties).forEach(([name, prop]) => {
    renderFormField(name, prop);
});
```

### 场景 3: 变更感知

通过 `metadata.json` 中的 `hash` 字段检测规范更新：

```javascript
const currentHash = require('vendor-specs/openai/official/metadata.json').hash;
const knownHash = require('./last-known-hash.json').openaiOfficial;

if (currentHash !== knownHash) {
    console.warn('OpenAI spec 已更新，请 review 变更内容');
}
```

### 场景 4: API 文档生成

```bash
# 使用 Redocly 生成 HTML 文档
npx @redocly/cli build-docs vendor-specs/openai/official/openapi.yml \
    --output docs/openai.html

npx @redocly/cli build-docs vendor-specs/gemini/official/openapi.yml \
    --output docs/gemini.html
```

---

## 同步和维护

### 同步所有规范（Tier 1 + Tier 2）

```bash
bash scripts/sync-all.sh
# 或
npm run sync
```

### 更新 Anthropic 规范（Tier 3，手动）

直接编辑 `anthropic/official/openapi.yml`，参照 https://docs.anthropic.com/en/api/messages。

修改后更新 metadata：

```bash
# 更新 lastSynced 和 hash
shasum -a 256 anthropic/official/openapi.yml
# 手动更新 anthropic/official/metadata.json
```

### 验证

```bash
bash scripts/validate-all.sh
```

---

## 故障排查

**规范文件不存在**

```bash
# 检查是否已 sync
bash scripts/sync-all.sh

# 检查 submodule 是否初始化
git submodule status
git submodule update --init
```

**Tier 2 转换失败（Gemini/Vertex）**

```bash
# 确认 Node.js 已安装
node --version

# 安装依赖
npm install

# 手动转换
node scripts/convert/discovery-to-openapi.js \
    gemini/official/discovery.json \
    gemini/official/openapi.yml
```

**规范格式校验失败**

```bash
npx @redocly/cli lint vendor-specs/openai/official/openapi.yml
```
