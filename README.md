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

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

MIT License
