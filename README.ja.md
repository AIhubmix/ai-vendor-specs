# ai-vendor-specs

> 主要な AI プロバイダーの公式 OpenAPI / Discovery 仕様をまとめたリポジトリ — 毎日自動同期 + ドリフト検知。

**言語**: [English](./README.md) · [简体中文](./README.zh-CN.md) · 日本語

`ai-vendor-specs` は OpenAI、Anthropic、Cohere、Google、Microsoft などの主要 AI プロバイダー、および OpenAI 互換プロバイダー群が公開している公式 API 仕様を一箇所に集約し、SDK ジェネレーター、ゲートウェイ、ドキュメントサイト、契約テスト、IDE 補完、AI エージェントのツールレジストリといった下流ツールから一貫したデータセットとして利用できるようにします。

機械可読な仕様を提供していないバリアント(AWS Bedrock 上の Claude、Groq などの OpenAI 互換プロバイダー)については、コンパクトな overlay ファイルで差分のみを宣言し、解決時にベース仕様と合成して完全な仕様を生成します。リポジトリ自体は派生物を一切保持せず、すべてのバイトが上流の公式ソースまで辿れる構造です。

---

## 対応プロバイダー

| プロトコル | プロバイダー | 種別 | 上流ソース |
|---|---|---|---|
| openai | official | spec | Stainless |
| openai | azure | spec | Azure REST API Specs(stable 2024-10-21) |
| openai | azure-preview | spec | Azure REST API Specs(preview 2025-04-01-preview) |
| openai | deepseek | overlay | api-docs.deepseek.com |
| openai | groq | overlay | console.groq.com/docs |
| openai | together | overlay | docs.together.ai |
| openai | xai | overlay | docs.x.ai |
| anthropic | official | spec | Anthropic SDK `.stats.yml` → Stainless |
| anthropic | bedrock | overlay | AWS Bedrock ドキュメント |
| cohere | official | spec | cohere-developer-experience |
| gemini | official | spec | Google Discovery(`generativelanguage.googleapis.com`) |
| vertex | official | spec | Google Discovery(`aiplatform.googleapis.com`) |

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
| [Architecture](./docs/ARCHITECTURE.md) | すべての人 | 設計、種別、metadata スキーマ、overlay 構文 |
| [Usage Guide](./docs/USAGE.md) | 利用者 | 利用パターンと典型シナリオ |
| [Sources](./docs/SOURCES.md) | 監査者 | プロバイダー別の上流 URL と同期方式 |
| [Contributing](./CONTRIBUTING.md) | 貢献者 | プロバイダー追加、ローカル開発、ドリフト、Webhook |

---

## License

MIT
