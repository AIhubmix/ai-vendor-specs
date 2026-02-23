# proxy-specs 与 One API 集成指南

## 概述

本文档说明如何在 One API 项目中集成和使用 proxy-specs 规范仓库。

## One API 简介

One API 是一个 OpenAI 接口管理与分发系统，通过标准的 OpenAI API 格式访问所有大模型。

**技术栈：**
- 后端：Go 1.20 + Gin + GORM
- 前端：React
- 数据库：SQLite / MySQL / PostgreSQL
- 缓存：Redis / FreeCache

**核心功能：**
- 多厂商 AI 模型统一接口
- 请求路由和负载均衡
- 用户额度管理和计费
- 渠道管理和监控

## 集成方式

### 方式 1: Git Submodule（推荐生产环境）

在 One API 项目中添加 proxy-specs 作为子模块：

```bash
cd /path/to/one-api
git submodule add https://github.com/your-org/proxy-specs.git vendor-specs
git submodule update --init --recursive

# 后续更新规范
git submodule update --remote vendor-specs
```

### 方式 2: 符号链接（开发环境）

适用于本地开发，方便同时修改两个项目：

```bash
cd /path/to/one-api
ln -s ../proxy-specs vendor-specs
```

### 方式 3: NPM 包（未来支持）

```bash
npm install @your-org/proxy-specs
```

## 使用场景

### 1. 渠道适配器开发

在 One API 的适配器中使用规范来验证请求/响应格式：

```go
// relay/adaptor/openai/main.go
package openai

import (
    "encoding/json"
    "os"
)

// 加载 OpenAI 官方规范
func loadOpenAPISpec() (*OpenAPISpec, error) {
    specPath := "vendor-specs/openai/official/openapi.yml"
    data, err := os.ReadFile(specPath)
    if err != nil {
        return nil, err
    }

    var spec OpenAPISpec
    if err := yaml.Unmarshal(data, &spec); err != nil {
        return nil, err
    }

    return &spec, nil
}

// 使用规范验证请求参数
func (a *Adaptor) ConvertRequest(c *gin.Context, relayMode int, request *model.GeneralOpenAIRequest) (any, error) {
    spec, err := loadOpenAPISpec()
    if err != nil {
        return nil, err
    }

    // 根据规范验证请求
    if err := validateRequest(request, spec); err != nil {
        return nil, err
    }

    return request, nil
}
```

### 2. 动态模型列表

从规范中提取支持的模型列表：

```go
// model/ability.go
package model

import (
    "gopkg.in/yaml.v3"
    "os"
)

// 从规范中加载模型列表
func LoadModelsFromSpec(protocol, provider string) ([]string, error) {
    specPath := fmt.Sprintf("vendor-specs/%s/%s/openapi.yml", protocol, provider)

    spec, err := loadSpec(specPath)
    if err != nil {
        return nil, err
    }

    // 从规范的 components.schemas 或其他部分提取模型名称
    models := extractModels(spec)

    return models, nil
}
```

### 3. API 文档生成

使用规范自动生成 API 文档：

```bash
# 为每个支持的协议生成文档
redocly build-docs vendor-specs/openai/official/openapi.yml \
    --output docs/api/openai.html

redocly build-docs vendor-specs/google/gemini/openapi.yml \
    --output docs/api/gemini.html

redocly build-docs vendor-specs/anthropic/official/openapi.yml \
    --output docs/api/anthropic.html
```

### 4. 测试用例生成

基于规范生成集成测试：

```go
// test/integration_test.go
package test

import (
    "testing"
    "gopkg.in/yaml.v3"
)

func TestOpenAICompatibility(t *testing.T) {
    // 加载 OpenAI 规范
    spec := loadSpec("vendor-specs/openai/official/openapi.yml")

    // 为每个端点生成测试
    for path, pathItem := range spec.Paths {
        for method, operation := range pathItem {
            t.Run(operation.OperationID, func(t *testing.T) {
                // 使用规范中的示例数据测试端点
                testEndpoint(method, path, operation)
            })
        }
    }
}
```

## One API 架构与 proxy-specs 的关系

### One API 请求流程

```
客户端请求
    ↓
认证中间件 (middleware/auth.go)
    ↓
分发器 (middleware/distributor.go)
    ↓                    ← 使用 proxy-specs 选择协议
中继控制器 (relay/controller/)
    ↓                    ← 使用 proxy-specs 验证请求
适配器 (relay/adaptor/)
    ↓                    ← 使用 proxy-specs 转换格式
上游 AI 服务
    ↓                    ← 使用 proxy-specs 验证响应
适配器
    ↓
计费 (relay/billing/)
    ↓
返回客户端
```

### proxy-specs 在各层的作用

#### 1. 分发器层
- 读取规范的 `servers.url` 确定上游 baseURL
- 读取规范的 `paths` 确定支持的端点

#### 2. 适配器层
- 使用规范的 `requestBody.schema` 验证请求参数
- 使用规范的 `responses.schema` 验证响应格式
- 参考规范的 `security` 部分处理认证

#### 3. 计费层
- 从规范的 `x-model-pricing` 等扩展字段读取定价信息（如果有）
- 使用规范确定 token 计算方式

## 规范更新流程

### 自动更新（Tier 1）

proxy-specs 通过 GitHub Actions 每日自动同步 Tier 1 规范：

1. GitHub Actions 在 proxy-specs 仓库运行
2. 下载最新的官方规范
3. 提交变更并创建 tag
4. One API 项目更新 submodule：

```bash
cd one-api
git submodule update --remote vendor-specs
git add vendor-specs
git commit -m "chore: update proxy-specs to latest"
```

### 手动更新（Tier 3）

当国内厂商 API 变更时：

1. 在 proxy-specs 项目中更新配置文件
2. 重新生成规范
3. 提交到 proxy-specs
4. One API 更新 submodule

## 最佳实践

### 1. 启动时加载规范

在应用启动时一次性加载所有规范到内存：

```go
// common/spec_cache.go
package common

var SpecCache = make(map[string]*OpenAPISpec)

func InitSpecCache() {
    protocols := map[string][]string{
        "openai": {"official", "azure"},
        "anthropic": {"official"},
        "google": {"gemini"},
    }

    for protocol, providers := range protocols {
        for _, provider := range providers {
            path := fmt.Sprintf("vendor-specs/%s/%s/openapi.yml", protocol, provider)
            spec, err := loadSpec(path)
            if err != nil {
                log.Printf("Warning: failed to load spec %s/%s: %v", protocol, provider, err)
                continue
            }

            key := fmt.Sprintf("%s/%s", protocol, provider)
            SpecCache[key] = spec
        }
    }
}
```

### 2. 优雅降级

当规范不可用时，使用硬编码的最小规范：

```go
func GetSpec(protocol, provider string) *OpenAPISpec {
    key := fmt.Sprintf("%s/%s", protocol, provider)

    if spec, ok := SpecCache[key]; ok {
        return spec
    }

    // 降级：返回最小规范
    log.Printf("Warning: spec %s not found, using minimal spec", key)
    return getMinimalSpec(protocol, provider)
}

func getMinimalSpec(protocol, provider string) *OpenAPISpec {
    return &OpenAPISpec{
        OpenAPI: "3.0.0",
        Info: map[string]interface{}{
            "title": fmt.Sprintf("%s/%s API", protocol, provider),
            "version": "unknown",
        },
        Paths: getDefaultPaths(protocol),
    }
}
```

### 3. 版本锁定

生产环境建议锁定 proxy-specs 的特定版本：

```bash
cd vendor-specs
git checkout v1.2.0
cd ..
git add vendor-specs
git commit -m "chore: lock proxy-specs to v1.2.0"
```

### 4. 选择合适的 Tier

根据项目需求选择不同 Tier 的规范：

- **核心功能**: 使用 Tier 1（OpenAI、Azure、Cohere）
- **Google 集成**: 使用 Tier 2（Gemini、Vertex）
- **国内厂商**: 使用 Tier 3，但定期验证

## 常见问题

### Q: proxy-specs 更新频率如何？

- **Tier 1**: 每日自动同步
- **Tier 2**: 每日自动同步并转换
- **Tier 3**: 需要手动更新

### Q: 如何处理规范与实际 API 的差异？

1. 对于 Tier 1/2，提 issue 到 proxy-specs
2. 对于 Tier 3，提 PR 更新配置文件
3. 紧急情况下，在 One API 中添加覆盖逻辑

### Q: 是否必须使用 proxy-specs？

不是必须的。One API 可以独立运行，proxy-specs 提供：
- 更标准的规范管理
- 自动更新机制
- 跨项目复用

如果不使用，需要自己维护规范副本。

### Q: 如何贡献规范？

1. Fork proxy-specs 仓库
2. 更新规范或配置文件
3. 运行验证脚本
4. 提交 Pull Request

## 相关文档

- [proxy-specs 架构设计](./ARCHITECTURE.md)
- [proxy-specs 使用指南](./USAGE.md)
- [One API 文档](https://github.com/songquanpeng/one-api/blob/main/README.md)

## 示例代码

完整的集成示例可以在 One API 项目中找到：

```
one-api/
├── relay/adaptor/openai/      # 使用 openai/official 规范
├── relay/adaptor/gemini/      # 使用 google/gemini 规范
├── relay/adaptor/anthropic/   # 使用 anthropic/official 规范
└── common/spec_loader.go      # 规范加载工具
```

## 联系方式

- proxy-specs Issues: https://github.com/your-org/proxy-specs/issues
- One API Issues: https://github.com/songquanpeng/one-api/issues
