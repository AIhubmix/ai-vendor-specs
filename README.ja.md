# ai-vendor-specs

> 主要な AI プロバイダーの公式 OpenAPI / Discovery 仕様をまとめたリポジトリ — 毎日自動同期 + ドリフト検知。

**言語**: [English](./README.md) · [简体中文](./README.zh-CN.md) · 日本語

**🌐 仕様を閲覧**: [aihubmix.github.io/ai-vendor-specs](https://aihubmix.github.io/ai-vendor-specs/) — すべての上流仕様を Redoc でレンダリング、プロトコル絞り込みタブ付き。

`ai-vendor-specs` は OpenAI、Anthropic、Cohere、Google、Microsoft などの主要 AI プロバイダー、および OpenAI 互換プロバイダー群が公開している公式 API 仕様を一箇所に集約し、SDK ジェネレーター、ゲートウェイ、ドキュメントサイト、契約テスト、IDE 補完、AI エージェントのツールレジストリといった下流ツールから一貫したデータセットとして利用できるようにします。

機械可読な仕様を提供していないバリアント(AWS Bedrock 上の Claude、Groq などの OpenAI 互換プロバイダー)については、コンパクトな overlay ファイルで差分のみを宣言し、解決時にベース仕様と合成して完全な仕様を生成します。リポジトリ自体は派生物を一切保持せず、すべてのバイトが上流の公式ソースまで辿れる構造です。

---

## 対応プロバイダー

| プロトコル | プロバイダー | 種別 | 上流ソース |
|---|---|---|---|
| openai | official | spec | [openai/openai-openapi](https://github.com/openai/openai-openapi)(Stainless) |
| openai | azure | spec | [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable) · 固定 `2024-10-21` |
| openai | azure-preview | spec | [Azure/azure-rest-api-specs preview](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview) · 固定 `2025-04-01-preview` |
| openai | deepseek | overlay | [api-docs.deepseek.com](https://api-docs.deepseek.com/) |
| openai | groq | overlay | [console.groq.com/docs](https://console.groq.com/docs/api-reference) |
| openai | together | overlay | [docs.together.ai](https://docs.together.ai/reference/chat-completions) |
| openai | xai | overlay | [docs.x.ai](https://docs.x.ai/docs/api-reference) |
| anthropic | official | spec | [anthropics/anthropic-sdk-python `.stats.yml`](https://github.com/anthropics/anthropic-sdk-python/blob/main/.stats.yml) → Stainless |
| anthropic | bedrock | overlay | [AWS Bedrock InvokeModel docs](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html) |
| cohere | official | spec | [cohere-ai/cohere-developer-experience](https://github.com/cohere-ai/cohere-developer-experience) |
| gemini | official | spec | [Google AI Discovery](https://ai.google.dev/api/rest)(`generativelanguage.googleapis.com`) |
| vertex | official | spec | [Google Cloud Discovery](https://cloud.google.com/vertex-ai/docs/reference/rest)(`aiplatform.googleapis.com`) |
| openai | cerebras | spec | [cerebras-cloud-sdk-python `.stats.yml`](https://github.com/Cerebras/cerebras-cloud-sdk-python/blob/main/.stats.yml) → Stainless |
| openai | deepinfra | spec | [api.deepinfra.com/openapi.json](https://api.deepinfra.com/openapi.json) |
| openai | siliconflow | spec | [docs.siliconflow.cn](https://docs.siliconflow.cn/cn/api-reference/openapi.yaml) |
| openai | moonshot | spec | [platform.moonshot.cn/docs/openapi.json](https://platform.moonshot.cn/docs/openapi.json) (Kimi) |
| zhipu | official | spec | [docs.z.ai/openapi.json](https://docs.z.ai/openapi.json) (Z.AI / Zhipu GLM) |
| mistral | official | spec | [mistralai/platform-docs-public](https://github.com/mistralai/platform-docs-public/blob/main/openapi.yaml) |
| perplexity | official | spec | [docs.perplexity.ai/openapi.json](https://docs.perplexity.ai/openapi.json) |
| ideogram | official | spec | [developer.ideogram.ai/openapi.yaml](https://developer.ideogram.ai/openapi.yaml) |
| jina | official | spec | [api.jina.ai/openapi.json](https://api.jina.ai/openapi.json) |
| flux | official | spec | [api.bfl.ai/openapi.json](https://api.bfl.ai/openapi.json) (Black Forest Labs) |
| openai | bytedance | overlay | [Volcengine Ark](https://www.volcengine.com/docs/82379) (Doubao) |
| openai | sophnet | overlay | [SophNet](https://www.sophnet.com/docs/component/API.html) |
| openai | baidu | overlay | [Baidu Qianfan](https://cloud.baidu.com/doc/qianfan/s/Hmh4suq26) (ERNIE) |
| openai | chutes | overlay | [Chutes](https://chutes.ai/llms-full.txt) |
| openai | alibaba | overlay | [Alibaba DashScope / Qwen](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) |
| openai | yi | overlay | [01.AI](https://platform.lingyiwanwu.com/docs) |
| openai | stepfun | overlay | [StepFun](https://platform.stepfun.com/docs) |
| openai | nvidia | overlay | [NVIDIA NIM](https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html) |
| openai | minimax | overlay | [MiniMax](https://platform.minimaxi.com/docs/api-reference/text-chat-openai.md) |
| openai | baichuan | overlay | [Baichuan](https://platform.baichuan-ai.com/docs/api) |
| openai | xiaomi | overlay | [Xiaomi MiMo](https://platform.xiaomimimo.com/docs/en-US/api/chat/openai-api) |
| openai | daocloud | overlay | [DaoCloud d.run](https://docs.daocloud.io/en/hydra/api-call/) |

上流 URL、同期方法、バージョン固定の詳細は [`docs/SOURCES.md`](./docs/SOURCES.md) を参照してください。

---

## 仕組み

ai-vendor-specs は薄いデータ層に徹しています。各 AI プロバイダーの API 真実(machine-readable, 監査可能)を 1 箇所に保ち、統一 URI スキームで配信することだけが仕事です。

```
┌─── 12+ 個の上流プロバイダー ──────────────────────────────────┐
│   OpenAI / Azure OpenAI / Anthropic / Cohere / Google /        │
│   xAI / DeepSeek / Groq / Together / AWS Bedrock               │
└────────────────────────────┬──────────────────────────────────┘
                             │ 毎日 cron で同期(機械可読仕様)
                             │ overlay で差分宣言(仕様なしの場合)
                             ▼
┌─── ai-vendor-specs(このリポジトリ)─────────────────────────────┐
│                                                                │
│   upstream/<protocol>/<provider>/                              │
│     openapi.{yml,json} | discovery.json     ← spec(自動同期)  │
│     overlay.yml                              ← overlay(手動)  │
│                                                                │
│   manifest.json   ← すべてのエントリーへのディスカバリー入口    │
│   resolver lib    ← base + overlay を完全な spec に合成         │
│   drift detector  ← 上流変更 / overlay 期限切れ / 同期失敗を警告│
└────────────────────────────┬──────────────────────────────────┘
                             │ npm / PyPI / submodule / raw / CDN
                             ▼
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  SDK ジェネレーター      ゲートウェイ / proxy   ドキュメントサイト
  契約テスト              AI エージェント        IDE 補完
```

### このリポジトリがやること

- ✅ 各上流プロバイダーの機械可読 OpenAPI / Discovery 仕様を毎日同期、ハッシュ追跡
- ✅ 機械可読仕様を公開していない上流(AWS Bedrock、OpenAI 互換の xAI / DeepSeek / Groq / Together など)については overlay ファイルで差分を宣言
- ✅ トップレベル `manifest.json` を全利用者向けディスカバリー入口として維持
- ✅ ドリフト検知 — バージョン変動、overlay の期限切れ、同期失敗 — を下流に届く前に警告

### このリポジトリが**やらない**こと

- ❌ 派生物(合成済み spec、SDK、契約 fixture)の生成 — 利用者側の選択に委ねる
- ❌ 利用者固有のビジネスフィールドの記録 — 上流真実を中立に保つ

判断基準:**「これは上流が実際に公開しているものか?」** はい → ここ。いいえ → 利用者側。

アーキテクチャの詳細(種別、overlay 構文、metadata スキーマ)は [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) を参照してください。

---

## インストール

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

Python パッケージは同じ上流データを共有し、読み取り専用 API を提供します。overlay の合成は現在 JavaScript 版のみ対応しています。下記の [Python 使用例](#python-1) を参照してください。

### 直接ダウンロード(ランタイム不要)

```bash
# raw GitHub
curl https://raw.githubusercontent.com/AIhubmix/ai-vendor-specs/main/upstream/openai/official/openapi.yml

# jsDelivr CDN
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/upstream/openai/official/openapi.yml
```

---

## 使い方

### 任意の上流仕様を読み込む

```js
const { loadSpec } = require('@aihubmix/ai-vendor-specs');

// spec 種別:ファイルを直接ロード
const openai = loadSpec('avs://openai/official');

// overlay 種別:base + overlay を自動的に合成
const bedrock = loadSpec('avs://anthropic/bedrock');
const xai     = loadSpec('avs://openai/xai');

// JSON Pointer で特定の schema を取得
const cacheControl = loadSpec(
  'avs://anthropic/official#/components/schemas/CacheControlEphemeral'
);
```

### 利用可能な上流を一覧する

```js
const manifest = require('@aihubmix/ai-vendor-specs/manifest.json');

for (const [key, entry] of Object.entries(manifest.upstream)) {
  console.log(key, entry.kind, entry.rawUrl);
}
```

ランタイムを経由せず直接取得する場合:

```bash
curl https://cdn.jsdelivr.net/gh/AIhubmix/ai-vendor-specs@main/manifest.json
```

### Python

```python
import ai_vendor_specs as avs

# カタログ
manifest = avs.load_manifest()
for vendor in avs.list_vendors():
    print(vendor['key'], vendor['kind'])

# 単一検索
xai = avs.get_vendor('openai', 'xai')

# 生の spec ファイルパス(overlay 種別は overlay.yml を返します。
# 合成は JavaScript 版 resolver が必要。Python 版合成器はロードマップ上)
spec_path = avs.load_spec_path('openai', 'official')
```

---

## ユースケース

### 1. ゲートウェイ / proxy 仕様の合成
上流の骨格をロードし、自分の overlay を適用してゲートウェイが公開する仕様を生成します。

```js
const { loadSpec, applyOverlay } = require('@aihubmix/ai-vendor-specs');
const base = loadSpec('avs://openai/official');
const final = applyOverlay(base, myGatewayOverlay);  // overlay = 認証、エラー形式など
```

### 2. SDK / 型生成
任意の OpenAPI codegen に投入できます。毎日の自動同期で型が古くなりません。

```bash
npx openapi-typescript node_modules/@aihubmix/ai-vendor-specs/upstream/openai/official/openapi.yml \
  -o src/types/openai.d.ts
```

### 3. 上流真実に対する契約テスト
上流が約束しているフィールドが実際に存在するかをアサート。

```js
const spec = loadSpec('avs://openai/official');
const required = spec.components.schemas.CreateChatCompletionResponse.required;
required.forEach(f => expect(actual[f]).not.toBeUndefined());
```

(自家ゲートウェイのレスポンスは自家仕様でテスト。これは「上流が黙ってフィールドを変えたか」の検出用。)

### 4. ドキュメントサイトで上流仕様を表示
`node_modules/` から生ファイルを読んで Redoc / Swagger UI に渡します。本プロジェクトの [doc site](https://aihubmix.github.io/ai-vendor-specs/) はこの方式で構築されています。

### 5. Discovery → OpenAPI 変換
Gemini / Vertex は Google Discovery 形式。ツールチェーンが OpenAPI のみ対応なら [gnostic](https://github.com/google/gnostic) で変換:

```bash
gnostic upstream/gemini/official/discovery.json --openapi-out=gemini.yml
```

### 6. AI エージェントツールレジストリ
`paths` / `operations` を走査して関数呼び出しスキーマを生成、LangChain / MCP などのエージェントフレームワークに渡します。`operationId`、パラメータ schema、リクエストボディ形状すべてツール記述子に 1:1 マップ可能。

---

## `avs://` URI スキーム

上流仕様への参照はすべて同一の URI スキームを使います:

```
avs://<protocol>/<provider>[#<JSON-Pointer>]
```

| 例 | 解決先 |
|---|---|
| `avs://openai/official` | OpenAI の完全な OpenAPI 仕様 |
| `avs://anthropic/bedrock` | 合成された Bedrock 仕様(base + overlay) |
| `avs://anthropic/official#/components/schemas/Message` | Anthropic 仕様内の特定 schema |
| `avs://gemini/official` | Gemini の Google Discovery ドキュメント |

リゾルバはデータルートを以下の順で探索します:

1. 環境変数 `AVS_ROOT`(明示的な指定)
2. カレントディレクトリがリポジトリ自身の場合
3. `node_modules/@aihubmix/ai-vendor-specs/`(npm install)
4. 同一階層の `ai-vendor-specs/` ディレクトリ(git submodule)

overlay や利用者側のコードは、どのデプロイ形態で動いているかを意識する必要はありません。

---

## ドキュメント

| ドキュメント | 想定読者 | 内容 |
|---|---|---|
| [ライブドキュメントサイト](https://aihubmix.github.io/ai-vendor-specs/) | 閲覧者 | 全上流仕様の Redoc ビュー、プロトコル絞り込みタブ付き |
| [Architecture](./docs/ARCHITECTURE.md) | すべての人 | 設計、種別、metadata スキーマ、overlay 構文 |
| [Sources](./docs/SOURCES.md) | 監査者 | プロバイダー別の上流 URL と同期方式 |
| [Contributing](./CONTRIBUTING.md) | 貢献者 | プロバイダー追加、ローカル開発、ドリフト、Webhook |

---

## License

MIT
