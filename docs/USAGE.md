# proxy-specs 使用指南

## 快速开始

### 1. 集成到项目

#### 方式 A: Git Submodule（推荐生产环境）

```bash
# 添加为 submodule
git submodule add https://github.com/your-org/proxy-specs.git vendor-specs

# 初始化和更新
git submodule update --init --recursive

# 后续更新
git submodule update --remote vendor-specs
```

#### 方式 B: 符号链接（开发环境）

```bash
# 克隆到本地
git clone https://github.com/your-org/proxy-specs.git ../proxy-specs

# 创建符号链接
ln -s ../proxy-specs vendor-specs
```

#### 方式 C: NPM 包（未来支持）

```bash
npm install proxy-specs
```

### 2. 加载规范

#### Go 示例

```go
package main

import (
    "os"
    "gopkg.in/yaml.v3"
)

type OpenAPISpec struct {
    OpenAPI string                 `yaml:"openapi"`
    Info    map[string]interface{} `yaml:"info"`
    Paths   map[string]interface{} `yaml:"paths"`
}

func loadSpec(path string) (*OpenAPISpec, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }

    var spec OpenAPISpec
    if err := yaml.Unmarshal(data, &spec); err != nil {
        return nil, err
    }

    return &spec, nil
}

func main() {
    // Tier 1: OpenAI 官方规范
    spec, _ := loadSpec("vendor-specs/openai/official/openapi.yml")

    // Tier 1: Azure OpenAI 规范
    azureSpec, _ := loadSpec("vendor-specs/openai/azure/openapi.json")

    // Tier 2: Google Gemini 规范（转换后）
    geminiSpec, _ := loadSpec("vendor-specs/google/gemini/openapi.yml")

    // Tier 3: 百度文心规范（配置生成）
    ernieSpec, _ := loadSpec("vendor-specs/baidu/ernie/openapi.yml")
}
```

#### Python 示例

```python
import yaml
import json
from pathlib import Path

def load_spec(path):
    """加载 OpenAPI 规范"""
    spec_path = Path(path)

    if spec_path.suffix == '.yml' or spec_path.suffix == '.yaml':
        with open(spec_path) as f:
            return yaml.safe_load(f)
    elif spec_path.suffix == '.json':
        with open(spec_path) as f:
            return json.load(f)
    else:
        raise ValueError(f"Unsupported format: {spec_path.suffix}")

# Tier 1: OpenAI 官方
openai_spec = load_spec("vendor-specs/openai/official/openapi.yml")

# Tier 1: Cohere
cohere_spec = load_spec("vendor-specs/cohere/official/openapi.yml")

# Tier 2: Google Gemini Discovery 格式
gemini_discovery = load_spec("vendor-specs/google/gemini/discovery.json")

# Tier 2: Google Gemini OpenAPI 格式（转换后）
gemini_openapi = load_spec("vendor-specs/google/gemini/openapi.yml")
```

#### JavaScript/TypeScript 示例

```javascript
const fs = require('fs');
const yaml = require('js-yaml');

function loadSpec(path) {
    const content = fs.readFileSync(path, 'utf8');

    if (path.endsWith('.yml') || path.endsWith('.yaml')) {
        return yaml.load(content);
    } else if (path.endsWith('.json')) {
        return JSON.parse(content);
    }
}

// Tier 1: OpenAI
const openaiSpec = loadSpec('vendor-specs/openai/official/openapi.yml');

// Tier 1: Azure OpenAI
const azureSpec = loadSpec('vendor-specs/openai/azure/openapi.json');

// Tier 3: 阿里通义
const qwenSpec = loadSpec('vendor-specs/alibaba/qwen/openapi.yml');
```

### 3. 读取元数据

```go
package main

import (
    "encoding/json"
    "os"
)

type Metadata struct {
    Protocol    string `json:"protocol"`
    Provider    string `json:"provider"`
    DisplayName string `json:"displayName"`
    Version     string `json:"version"`
    SpecFormat  string `json:"specFormat"`
    Source      string `json:"source"`
    LastSynced  string `json:"lastSynced"`
    AutoSync    bool   `json:"autoSync"`
    Tier        int    `json:"tier,omitempty"`
}

func loadMetadata(protocol, provider string) (*Metadata, error) {
    path := fmt.Sprintf("vendor-specs/%s/%s/metadata.json", protocol, provider)
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }

    var meta Metadata
    if err := json.Unmarshal(data, &meta); err != nil {
        return nil, err
    }

    return &meta, nil
}

// 使用
meta, _ := loadMetadata("openai", "official")
fmt.Printf("Provider: %s, Last Synced: %s\n", meta.DisplayName, meta.LastSynced)
```

---

## 按场景使用

### 场景 1: 实现 AI 代理服务

如果你正在开发类似 One API 的代理服务：

```go
// 1. 加载所有支持的规范
specs := map[string]*OpenAPISpec{
    "openai":     loadSpec("vendor-specs/openai/official/openapi.yml"),
    "azure":      loadSpec("vendor-specs/openai/azure/openapi.json"),
    "gemini":     loadSpec("vendor-specs/google/gemini/openapi.yml"),
    "claude":     loadSpec("vendor-specs/anthropic/official/openapi.yml"),
    "ernie":      loadSpec("vendor-specs/baidu/ernie/openapi.yml"),
    "qwen":       loadSpec("vendor-specs/alibaba/qwen/openapi.yml"),
}

// 2. 根据规范动态生成路由
for name, spec := range specs {
    for path, pathItem := range spec.Paths {
        // 注册路由处理器
        registerRoute(name, path, pathItem)
    }
}

// 3. 验证请求参数
func validateRequest(provider string, endpoint string, params map[string]interface{}) error {
    spec := specs[provider]
    schema := spec.Paths[endpoint].Post.RequestBody.Content["application/json"].Schema
    return validate(params, schema)
}
```

### 场景 2: API 文档生成

使用 Redoc 或 Swagger UI 生成交互式文档：

```bash
# 安装 Redoc CLI
npm install -g @redocly/cli

# 为每个规范生成文档
redocly build-docs vendor-specs/openai/official/openapi.yml \
    --output docs/openai.html

redocly build-docs vendor-specs/google/gemini/openapi.yml \
    --output docs/gemini.html

# 或者合并多个规范
redocly bundle \
    vendor-specs/openai/official/openapi.yml \
    vendor-specs/anthropic/official/openapi.yml \
    --output combined.yml
```

### 场景 3: 自动化测试

基于规范生成测试用例：

```python
import yaml
from pathlib import Path

def generate_tests(spec_path):
    """从 OpenAPI 规范生成测试用例"""
    spec = yaml.safe_load(Path(spec_path).read_text())

    tests = []
    for path, methods in spec['paths'].items():
        for method, operation in methods.items():
            # 生成基础测试
            tests.append({
                'name': operation.get('operationId', f'{method}_{path}'),
                'method': method.upper(),
                'path': path,
                'description': operation.get('summary', ''),
            })

    return tests

# 为所有规范生成测试
for spec_file in Path('vendor-specs').rglob('openapi.yml'):
    tests = generate_tests(spec_file)
    print(f"Generated {len(tests)} tests for {spec_file}")
```

### 场景 4: SDK 生成

使用 OpenAPI Generator 生成多语言 SDK：

```bash
# 安装 OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# 生成 Python SDK
openapi-generator-cli generate \
    -i vendor-specs/openai/official/openapi.yml \
    -g python \
    -o sdk/openai-python

# 生成 Go SDK
openapi-generator-cli generate \
    -i vendor-specs/cohere/official/openapi.yml \
    -g go \
    -o sdk/cohere-go

# 生成 TypeScript SDK
openapi-generator-cli generate \
    -i vendor-specs/google/gemini/openapi.yml \
    -g typescript-axios \
    -o sdk/gemini-typescript
```

---

## 维护和更新

### 自动更新（Tier 1）

Tier 1 规范会通过 GitHub Actions 每日自动同步：

```bash
# 手动触发同步
npm run sync

# 或直接运行脚本
bash scripts/sync-all.sh
```

### 手动更新（Tier 3）

对于基于配置生成的规范，当 API 发生变更时：

#### 1. 更新配置文件

编辑 `scripts/configs/<provider>.json`，添加新端点或修改现有端点：

```json
{
  "endpoints": [
    {
      "path": "/v1/new-endpoint",
      "method": "POST",
      "summary": "新增的 API 端点",
      "requestBody": { ... },
      "responses": { ... }
    }
  ]
}
```

#### 2. 重新生成规范

```bash
# 百度文心
bash scripts/sync/baidu-ernie.sh

# 阿里通义
bash scripts/sync/alibaba-qwen.sh
```

#### 3. 验证和提交

```bash
# 验证规范格式
bash scripts/validate-all.sh

# 提交变更
git add .
git commit -m "chore: update <provider> spec for API v2"
git push
```

### 版本管理

规范仓库使用语义化版本号：

```bash
# 查看当前版本
git tag

# 检出特定版本
git checkout v1.0.0

# 在 submodule 中锁定版本
cd your-project
git submodule update --remote vendor-specs
git add vendor-specs
git commit -m "chore: update specs to v1.2.0"
```

---

## 最佳实践

### 1. 选择合适的 Tier

- **Tier 1（优先）**: 质量最高，完全自动同步
  - 适合：生产环境核心 API
  - 示例：OpenAI、Azure OpenAI、Cohere

- **Tier 2（可用）**: 需转换，可能有小问题
  - 适合：Google 系 API
  - 注意：验证转换后的规范是否准确

- **Tier 3（谨慎）**: 手动维护，可能过时
  - 适合：国内厂商 API
  - 注意：定期对照官方文档验证

### 2. 缓存策略

```go
// 在应用启动时一次性加载所有规范
var specCache = make(map[string]*OpenAPISpec)

func init() {
    providers := []string{"openai", "azure", "gemini", "claude"}
    for _, provider := range providers {
        spec, err := loadSpec(fmt.Sprintf("vendor-specs/%s/official/openapi.yml", provider))
        if err == nil {
            specCache[provider] = spec
        }
    }
}

// 使用缓存的规范
func getSpec(provider string) *OpenAPISpec {
    return specCache[provider]
}
```

### 3. 错误处理

```go
func loadSpecSafely(path string) (*OpenAPISpec, error) {
    // 1. 检查文件是否存在
    if _, err := os.Stat(path); os.IsNotExist(err) {
        return nil, fmt.Errorf("spec file not found: %s", path)
    }

    // 2. 检查元数据
    metaPath := filepath.Join(filepath.Dir(path), "metadata.json")
    meta, err := loadMetadata(metaPath)
    if err != nil {
        log.Printf("Warning: metadata not found for %s", path)
    }

    // 3. 根据 Tier 决定是否需要验证
    if meta != nil && meta.Tier == 3 {
        log.Printf("Warning: using Tier 3 spec (%s), may be outdated", meta.DisplayName)
    }

    // 4. 加载规范
    spec, err := loadSpec(path)
    if err != nil {
        return nil, fmt.Errorf("failed to load spec: %w", err)
    }

    return spec, nil
}
```

### 4. 回退机制

```go
// 当规范不可用时，使用内置的最小规范
func getSpecWithFallback(provider string) *OpenAPISpec {
    spec, err := loadSpec(fmt.Sprintf("vendor-specs/%s/official/openapi.yml", provider))
    if err != nil {
        log.Printf("Failed to load spec for %s, using fallback", provider)
        return getMinimalSpec(provider)
    }
    return spec
}

func getMinimalSpec(provider string) *OpenAPISpec {
    // 返回硬编码的最小规范
    return &OpenAPISpec{
        OpenAPI: "3.0.0",
        Info: map[string]interface{}{
            "title": provider + " API",
            "version": "unknown",
        },
        Paths: getDefaultPaths(provider),
    }
}
```

---

## 故障排查

### 问题 1: 规范文件未找到

```bash
# 检查 submodule 是否正确初始化
git submodule status

# 如果显示未初始化，运行
git submodule update --init --recursive
```

### 问题 2: 规范格式错误

```bash
# 使用验证工具检查
bash vendor-specs/scripts/validate-all.sh

# 或使用 OpenAPI 验证器
npx @redocly/cli lint vendor-specs/openai/official/openapi.yml
```

### 问题 3: 规范版本过旧

```bash
# 更新 submodule 到最新版本
cd vendor-specs
git pull origin main

# 或重新同步规范
npm run sync
```

### 问题 4: Tier 2 转换失败

```bash
# 检查 Node.js 是否安装
node --version

# 安装依赖
cd vendor-specs
npm install

# 手动运行转换
node scripts/convert/discovery-to-openapi.js \
    google/gemini/discovery.json \
    google/gemini/openapi.yml
```

---

## 贡献规范

如果你发现规范有问题或需要更新，欢迎贡献：

### 报告问题

- Tier 1: 提 issue，附上规范来源 URL
- Tier 2: 提 issue，说明转换错误的具体位置
- Tier 3: 提 PR，更新配置文件或手动规范

### 提交 PR

```bash
# 1. Fork 仓库
# 2. 创建分支
git checkout -b fix/update-openai-spec

# 3. 更新规范或配置
vim scripts/configs/baidu-ernie.json

# 4. 重新生成（如适用）
bash scripts/sync/baidu-ernie.sh

# 5. 验证
bash scripts/validate-all.sh

# 6. 提交
git add .
git commit -m "fix: update Baidu ERNIE spec for new API endpoint"
git push origin fix/update-openai-spec

# 7. 创建 Pull Request
```

---

## 相关资源

- [OpenAPI 规范](https://spec.openapis.org/oas/latest.html)
- [Google Discovery Format](https://developers.google.com/discovery/v1/reference)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [OpenAPI Generator](https://openapi-generator.tech/)
