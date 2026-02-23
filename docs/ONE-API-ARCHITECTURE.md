# One API 架构参考

> 本文档介绍 One API 如何使用 proxy-specs 规范仓库，可作为其他 AI 代理项目的参考实现。

## One API 简介

One API 是一个 OpenAI 接口管理与分发系统，通过标准的 OpenAI API 格式访问所有大模型。

### 核心功能

- **多厂商支持**：支持 OpenAI、Anthropic、Google、百度、阿里等 30+ 大模型厂商
- **负载均衡**：支持多渠道负载均衡和自动故障转移
- **令牌管理**：支持令牌额度、过期时间、IP 白名单等细粒度控制
- **计费系统**：基于 token 的精确计费，支持分组倍率和模型倍率
- **多机部署**：支持主从架构的分布式部署

### 技术栈

- **后端**: Go 1.20 + Gin + GORM
- **前端**: React (多主题)
- **数据库**: SQLite / MySQL / PostgreSQL
- **缓存**: Redis / FreeCache

## 架构设计

### 核心架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       客户端请求                              │
│            (OpenAI 标准格式: /v1/chat/completions)           │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                    认证中间件 (middleware/auth.go)             │
│  - 验证 API Key                                               │
│  - 加载用户和令牌信息                                          │
│  - 检查额度和权限                                              │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                  分发器 (middleware/distributor.go)            │
│  - 根据模型和用户分组选择可用渠道                              │
│  - 负载均衡（随机/轮询）                                       │
│  - 失败重试机制                                                │
│  ← 使用 proxy-specs 确定协议和端点                            │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                中继控制器 (relay/controller/)                  │
│  - 解析请求参数                                                │
│  - 调用对应的适配器                                            │
│  - 处理流式/非流式响应                                         │
│  ← 使用 proxy-specs 验证请求格式                              │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                   适配器 (relay/adaptor/)                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│  │   OpenAI    │  Anthropic  │   Google    │   Baidu     │   │
│  │  Adaptor    │   Adaptor   │  Adaptor    │  Adaptor    │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┘   │
│  - 转换请求格式（OpenAI → 目标厂商）                           │
│  - 调用上游 API                                                │
│  - 转换响应格式（目标厂商 → OpenAI）                           │
│  ← 使用 proxy-specs 进行格式转换                              │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                 上游 AI 服务 (各厂商 API)                      │
│  - OpenAI API                                                 │
│  - Anthropic API                                              │
│  - Google Gemini API                                          │
│  - 百度文心 API                                                │
│  - ...                                                        │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│                    计费 (relay/billing/)                       │
│  - 计算 token 使用量                                           │
│  - 应用倍率（分组倍率 × 模型倍率）                             │
│  - 扣除用户额度                                                │
│  ← 使用 proxy-specs 确定 token 计算方式                       │
└───────────────────────────────────────────────────────────────┘
```

### 目录结构

```
one-api/
├── main.go                      # 应用入口
├── common/                      # 公共模块
│   ├── database.go             # 数据库初始化
│   ├── redis.go                # Redis 客户端
│   ├── cache/                  # FreeCache 缓存
│   └── logger/                 # 日志系统
├── controller/                  # HTTP 控制器
│   ├── channel.go              # 渠道管理
│   ├── token.go                # 令牌管理
│   ├── user.go                 # 用户管理
│   └── relay.go                # 中继请求入口
├── model/                       # 数据模型
│   ├── channel.go              # 渠道模型
│   ├── token.go                # 令牌模型
│   └── ability.go              # 渠道能力映射
├── relay/                       # 核心中继逻辑
│   ├── adaptor/                # 各厂商适配器 ← 使用 proxy-specs
│   │   ├── openai/             # OpenAI 适配器
│   │   ├── gemini/             # Google Gemini 适配器
│   │   ├── anthropic/          # Anthropic 适配器
│   │   └── ...
│   ├── controller/             # 中继控制器
│   ├── billing/                # 计费逻辑
│   └── channeltype/            # 渠道类型定义
├── middleware/                  # Gin 中间件
│   ├── auth.go                 # 认证中间件
│   ├── distributor.go          # 负载均衡
│   └── rate-limit.go           # 限流
├── router/                      # 路由定义
├── vendor-specs/                # proxy-specs 规范 (Git Submodule)
│   ├── openai/
│   ├── anthropic/
│   ├── google/
│   └── ...
└── web/                         # 前端代码
```

## proxy-specs 在 One API 中的应用

### 1. 渠道适配器中的规范使用

#### OpenAI 适配器示例

```go
// relay/adaptor/openai/main.go
package openai

import (
    "github.com/gin-gonic/gin"
    "gopkg.in/yaml.v3"
)

type Adaptor struct {
    spec *OpenAPISpec  // 从 proxy-specs 加载的规范
}

// 初始化时加载规范
func (a *Adaptor) Init(meta *meta.Meta) {
    spec, err := loadSpec("vendor-specs/openai/official/openapi.yml")
    if err != nil {
        // 降级到最小规范
        spec = getMinimalSpec()
    }
    a.spec = spec
}

// 转换请求时参考规范
func (a *Adaptor) ConvertRequest(c *gin.Context, relayMode int, request *model.GeneralOpenAIRequest) (any, error) {
    // 使用规范验证请求参数
    if err := a.validateRequest(request); err != nil {
        return nil, err
    }

    return request, nil
}

// 验证请求参数
func (a *Adaptor) validateRequest(request *model.GeneralOpenAIRequest) error {
    // 检查 model 是否在规范中定义
    if !a.spec.HasModel(request.Model) {
        return fmt.Errorf("unsupported model: %s", request.Model)
    }

    // 检查参数是否符合规范
    if request.Temperature != nil && (*request.Temperature < 0 || *request.Temperature > 2) {
        return fmt.Errorf("temperature must be between 0 and 2")
    }

    return nil
}
```

#### Gemini 适配器示例

```go
// relay/adaptor/gemini/main.go
package gemini

// Gemini 使用 Discovery 格式的规范
func (a *Adaptor) Init(meta *meta.Meta) {
    // 加载转换后的 OpenAPI 规范
    spec, err := loadSpec("vendor-specs/google/gemini/openapi.yml")
    if err != nil {
        // 或加载原始 Discovery 格式
        discoverySpec, _ := loadDiscoverySpec("vendor-specs/google/gemini/discovery.json")
        spec = convertToOpenAPI(discoverySpec)
    }
    a.spec = spec
}

// 转换请求格式（OpenAI → Gemini）
func (a *Adaptor) ConvertRequest(c *gin.Context, relayMode int, request *model.GeneralOpenAIRequest) (any, error) {
    // 根据 Gemini 规范构造请求
    geminiReq := &GeminiRequest{
        Contents: convertMessages(request.Messages),
        GenerationConfig: &GenerationConfig{
            Temperature:    request.Temperature,
            MaxOutputTokens: request.MaxTokens,
        },
    }

    return geminiReq, nil
}
```

### 2. 渠道能力映射

使用规范定义各渠道支持的功能：

```go
// model/ability.go
package model

// 从规范中加载渠道能力
func GetChannelAbility(channelType int) *ChannelAbility {
    switch channelType {
    case ChannelTypeOpenAI:
        return loadAbilityFromSpec("openai", "official")
    case ChannelTypeGemini:
        return loadAbilityFromSpec("google", "gemini")
    case ChannelTypeAnthropic:
        return loadAbilityFromSpec("anthropic", "official")
    }
}

// 从规范文件加载能力配置
func loadAbilityFromSpec(protocol, provider string) *ChannelAbility {
    specPath := fmt.Sprintf("vendor-specs/%s/%s/openapi.yml", protocol, provider)
    spec, _ := loadSpec(specPath)

    return &ChannelAbility{
        SupportStream:      hasStreamSupport(spec),
        SupportFunctionCall: hasFunctionCallSupport(spec),
        SupportVision:      hasVisionSupport(spec),
        SupportedModels:    extractModels(spec),
    }
}
```

### 3. 计费系统集成

基于规范中的定价信息进行计费：

```go
// relay/billing/ratio.go
package billing

// 从规范中加载模型定价
func GetModelPricing(protocol, provider, model string) (*ModelPricing, error) {
    specPath := fmt.Sprintf("vendor-specs/%s/%s/openapi.yml", protocol, provider)
    spec, err := loadSpec(specPath)
    if err != nil {
        return getDefaultPricing(model), nil
    }

    // 从规范的扩展字段读取定价
    // x-model-pricing 是自定义扩展
    if pricing, ok := spec.Extensions["x-model-pricing"]; ok {
        return parsePricing(pricing, model)
    }

    return getDefaultPricing(model), nil
}

// 计算额度
func CalculateQuota(usage *Usage, groupRatio, modelRatio float64) int64 {
    // 公式: 额度 = 分组倍率 × 模型倍率 × (提示 tokens + 补全 tokens × 补全倍率)
    completionRatio := getCompletionRatio(usage.Model)

    quota := float64(usage.PromptTokens) + float64(usage.CompletionTokens)*completionRatio
    quota *= groupRatio * modelRatio

    return int64(quota)
}
```

### 4. 动态路由生成

基于规范自动注册 API 端点：

```go
// router/api-router.go
package router

func RegisterAPIRoutes(router *gin.Engine) {
    // 加载所有支持的规范
    specs := loadAllSpecs()

    // 为每个规范中定义的端点注册路由
    for protocol, providerSpecs := range specs {
        for provider, spec := range providerSpecs {
            for path, pathItem := range spec.Paths {
                // 注册路由
                if pathItem.Post != nil {
                    router.POST(path, func(c *gin.Context) {
                        relayHandler(c, protocol, provider)
                    })
                }

                if pathItem.Get != nil {
                    router.GET(path, func(c *gin.Context) {
                        relayHandler(c, protocol, provider)
                    })
                }
            }
        }
    }
}
```

## 规范更新流程

### 1. 自动更新 (Tier 1)

proxy-specs 每日自动同步 Tier 1 规范，One API 定期更新 submodule：

```bash
# 在 One API 项目中
cd vendor-specs
git pull origin main
cd ..
git add vendor-specs
git commit -m "chore: update proxy-specs"
git push
```

### 2. 手动更新 (Tier 3)

当国内厂商 API 变更：

```bash
# 1. 在 proxy-specs 项目中更新配置
cd ../proxy-specs
vim scripts/configs/baidu-ernie.json

# 2. 重新生成规范
bash scripts/sync/baidu-ernie.sh

# 3. 提交到 proxy-specs
git add baidu/ernie/
git commit -m "feat: update ERNIE API spec"
git push

# 4. 在 One API 中更新 submodule
cd ../one-api
git submodule update --remote vendor-specs
git add vendor-specs
git commit -m "chore: update proxy-specs with new ERNIE spec"
```

## 计费逻辑示例

One API 支持复杂的分层计费，参考 [billing.md](./billing.md)。

### Gemini 分层定价

根据提示词长度应用不同价格：

```go
func CalculateGeminiQuota(usage *Usage, model string) int64 {
    var inputPrice, outputPrice float64

    // Gemini 2.5 Pro 分层定价
    if model == "gemini-2.5-pro" {
        if usage.PromptTokens <= 200000 {
            inputPrice = 1.25  // $1.25/M
            outputPrice = 10.00 // $10.00/M
        } else {
            inputPrice = 2.50   // $2.50/M
            outputPrice = 15.00 // $15.00/M
        }
    }

    quota := (float64(usage.PromptTokens) * inputPrice +
              float64(usage.CompletionTokens) * outputPrice) / 1000000

    return int64(quota * 1000000) // 转换为内部额度单位
}
```

### 上下文缓存计费

```go
func CalculateCachingQuota(usage *Usage, model string) int64 {
    var cachingPrice float64

    if model == "gemini-2.5-pro" {
        if usage.PromptTokens <= 200000 {
            cachingPrice = 0.31   // $0.31/M
        } else {
            cachingPrice = 0.625  // $0.625/M
        }

        // 存储费用: $4.50/M per hour
        storagePrice := 4.50
        storageDuration := usage.CacheDuration // 小时数
    }

    return calculateCacheQuota(usage, cachingPrice, storagePrice)
}
```

## 最佳实践

### 1. 规范缓存

在应用启动时加载所有规范到内存：

```go
var SpecCache = make(map[string]*OpenAPISpec)

func init() {
    // 加载所有规范
    specs := []struct{ protocol, provider string }{
        {"openai", "official"},
        {"openai", "azure"},
        {"anthropic", "official"},
        {"google", "gemini"},
        // ...
    }

    for _, s := range specs {
        key := fmt.Sprintf("%s/%s", s.protocol, s.provider)
        spec, _ := loadSpec(fmt.Sprintf("vendor-specs/%s/%s/openapi.yml", s.protocol, s.provider))
        SpecCache[key] = spec
    }
}
```

### 2. 优雅降级

当规范不可用时使用硬编码的最小规范：

```go
func GetSpec(protocol, provider string) *OpenAPISpec {
    key := fmt.Sprintf("%s/%s", protocol, provider)

    if spec, ok := SpecCache[key]; ok {
        return spec
    }

    log.Printf("Warning: spec %s not found, using minimal spec", key)
    return getMinimalSpec(protocol, provider)
}
```

### 3. 规范验证

在 CI/CD 中验证规范的有效性：

```bash
# .github/workflows/test.yml
- name: Validate specs
  run: |
    cd vendor-specs
    bash scripts/validate-all.sh
```

## 环境变量

One API 支持丰富的环境变量配置：

```bash
# 数据库
SQL_DSN="root:123456@tcp(localhost:3306)/oneapi"

# Redis (可选)
REDIS_CONN_STRING="redis://localhost:6379"

# 会话密钥 (多机部署必须)
SESSION_SECRET="random_string"

# 缓存
MEMORY_CACHE_ENABLED="true"
SYNC_FREQUENCY="600"

# 中继
RELAY_TIMEOUT="300"

# Gemini 特定配置
GEMINI_SAFETY_SETTING="BLOCK_NONE"
GEMINI_VERSION="v1"
```

## 多机部署

One API 支持主从架构：

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Master    │       │   Slave 1   │       │   Slave 2   │
│   Node      │◄─────►│    Node     │◄─────►│    Node     │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       └──────────┬──────────┴─────────────────────┘
                  │
            ┌─────▼─────┐
            │   MySQL   │
            └───────────┘
                  │
            ┌─────▼─────┐
            │   Redis   │
            └───────────┘
```

所有节点共享 vendor-specs：

```bash
# 各节点都需要同步 submodule
git submodule update --init --recursive
```

## 相关链接

- [One API 项目](https://github.com/songquanpeng/one-api)
- [proxy-specs 仓库](https://github.com/your-org/proxy-specs)
- [proxy-specs 架构设计](./ARCHITECTURE.md)
- [proxy-specs 使用指南](./USAGE.md)
- [集成指南](./INTEGRATION-WITH-ONE-API.md)

## 贡献

欢迎为 proxy-specs 贡献规范更新和改进！

- 提交 Issue: https://github.com/your-org/proxy-specs/issues
- 提交 PR: https://github.com/your-org/proxy-specs/pulls
