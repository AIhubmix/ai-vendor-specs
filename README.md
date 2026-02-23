# proxy-specs

> 通用的 AI 协议规范仓库，为 AI 代理服务提供统一的规范源

## 特性

- 🔄 **自动同步** - GitHub Actions 每日自动同步官方规范
- 📋 **协议优先** - 按协议分类，便于查找和对比
- 📦 **开箱即用** - NPM 包或 Git Submodule 两种使用方式
- 🌍 **多供应商** - 支持 OpenAI、Anthropic、Google 等多个协议
- 📝 **标准化** - 统一的 OpenAPI/Discovery 格式
- 🔖 **版本管理** - 语义化版本 + 变更日志

## 支持的协议

### OpenAI 协议
- OpenAI Official - 自动同步
- Azure OpenAI - 自动同步
- Moonshot (Kimi) - 兼容实现
- DeepSeek - 兼容实现
- Zhipu (GLM) - 兼容实现

### Anthropic 协议
- Anthropic Official (Claude) - 手动维护
- AWS Bedrock (Claude) - 半自动
- Vertex AI (Claude) - 半自动

### Google 协议
- Gemini API - 自动同步（Discovery 格式）
- Vertex AI (Gemini) - 自动同步

### 国内厂商
- 百度文心 (ERNIE) - 手动维护
- 阿里通义 (Qwen) - 手动维护
- 腾讯混元 (Hunyuan) - 手动维护

## 快速开始

### 方式 1: Git Submodule（推荐）
```bash
git submodule add https://github.com/your-org/proxy-specs.git specs
```

### 方式 2: 直接下载
```bash
curl -L https://github.com/your-org/proxy-specs/archive/refs/tags/v1.0.0.tar.gz | tar xz
```

## 使用示例

```go
// 加载 OpenAI 官方规范
spec := loadSpec("specs/openai/official/openapi.yml")

// 加载 Azure OpenAI 规范
azureSpec := loadSpec("specs/openai/azure/openapi.yml")

// 加载 Gemini 规范
geminiSpec := loadSpec("specs/google/gemini/discovery.json")
```

## 文档

- [架构设计](./docs/ARCHITECTURE.md) - 三层架构详细说明
- [使用指南](./docs/USAGE.md) - 集成方式和使用示例
- [One API 集成指南](./docs/INTEGRATION-WITH-ONE-API.md) - 如何在 One API 中使用 proxy-specs
- [One API 架构参考](./docs/ONE-API-ARCHITECTURE.md) - One API 架构设计和最佳实践

## 典型应用场景

### AI 代理服务

proxy-specs 特别适合用于 AI 代理服务（如 [One API](https://github.com/songquanpeng/one-api)）：

- **多厂商适配器**: 基于规范开发标准化的适配器
- **请求验证**: 使用规范验证请求参数
- **动态路由**: 根据规范自动注册 API 端点
- **计费系统**: 从规范中提取定价信息

### SDK 生成

使用 OpenAPI Generator 生成多语言 SDK：

```bash
openapi-generator-cli generate \
    -i specs/openai/official/openapi.yml \
    -g python \
    -o sdk/openai-python
```

### API 文档

使用 Redoc 生成交互式文档：

```bash
redocly build-docs specs/openai/official/openapi.yml \
    --output docs/openai.html
```

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

MIT License
