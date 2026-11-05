# AI Writing Assistant

翻訳・要約・文章生成の3機能を持つ文章作成支援アプリケーションのデモです。
Next.js + TypeScript のフロントエンドと、Python FastAPI のバックエンド、Claude API との連携コードで構成しています。

> **デモに関する注意**
>
> 現在のデモでは、API利用料金を発生させないため、固定のサンプルレスポンスを使用しています。Claude APIとの連携コードは保持していますが、デモ環境では実際のAPI呼び出しを行いません。
>
> 画面に表示される翻訳・要約・文章は事前に用意したサンプルであり、入力内容に応じて生成されたものではありません。

## 概要

| 項目 | 内容 |
|------|------|
| 目的 | 生成AIを組み込むWebアプリケーションの設計・実装を示すポートフォリオ |
| 既定の動作 | デモモード（APIキー不要、外部通信なし、費用なし） |
| Claude API連携 | コードは保持。`AI_MODE=live` を明示した場合のみ有効 |
| 動作確認の範囲 | デモモードは自動テストと実サーバーで確認。Claude API連携は現在モックによるテストのみで、実APIでは確認していません |

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router), React 19, TypeScript |
| バックエンド | Python, FastAPI, Pydantic v2, Uvicorn |
| AI連携 | Anthropic Python SDK (`AsyncAnthropic`), Claude Messages API |
| テスト | pytest, pytest-asyncio, Vitest |

## 主な機能

| 機能 | エンドポイント | 選択できる項目 |
|------|----------------|----------------|
| 翻訳 | `POST /api/ai/translate` | 翻訳元・翻訳先（日本語 / 英語 / 中国語） |
| 要約 | `POST /api/ai/summarize` | 出力言語（日本語 / 英語 / 中国語） |
| 文章生成 | `POST /api/ai/generate` | 言語、スタイル（ブログ / ビジネス文書 / カジュアル / 技術記事） |

デモ画面では「サンプル入力」ボタンで入力欄にサンプルを設定します（入力欄は読み取り専用です）。

## アーキテクチャ

同じ仕様のAPIを2通りの構成で提供しています。既定の構成では、フロントエンド単体で動作します。

```text
【既定】フロントエンド単体（バックエンドの起動は不要）

  ブラウザ ── lib/api.ts ──> Next.js API Route (/api/ai/*)
                                 ├─ デモモード（既定）: 固定サンプルを返却
                                 └─ AI_MODE=live     : Claude Messages API を呼び出し

【任意】FastAPI バックエンド（NEXT_PUBLIC_API_BASE_URL で接続先を指定）

  ブラウザ ── lib/api.ts ──> FastAPI (:8000/api/ai/*)
                                 ├─ デモモード（既定）: 固定サンプルを返却
                                 └─ AI_MODE=live     : AsyncAnthropic で Claude API を呼び出し
```

APIキーはサーバー側でのみ参照します。`NEXT_PUBLIC_` を付けていないため、ブラウザ向けのコードには含まれません。

`lambda/handler.py` はAWS Lambda向けの連携コードです。現在のデモでは使用しておらず、`AI_MODE=live` を設定しない限り503を返します。

### ディレクトリ構成

```text
ai-writing-assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI本体、CORS、入力エラーの整形
│   │   ├── config.py                   # 動作モードと環境変数の管理
│   │   ├── routers/ai.py               # エンドポイント、入力検証、モード切替
│   │   └── services/
│   │       ├── claude_service.py       # Claude API連携
│   │       ├── demo_service.py         # デモ応答の取得
│   │       └── demo_responses.json     # 固定サンプル
│   └── tests/
├── frontend/
│   ├── app/
│   │   ├── translate|summarize|generate/page.tsx  # 各機能の画面
│   │   └── api/ai/*/route.ts           # API Route
│   ├── lib/
│   │   ├── api.ts                      # ブラウザ側のAPIクライアント
│   │   ├── demo-responses.json         # 固定サンプル
│   │   └── server/                     # サーバー側のモード切替、Claude連携、入力検証
│   └── __tests__/
└── lambda/handler.py                   # AWS Lambda向けの連携コード
```

## デモモードの実装

- **既定で有効**です。`AI_MODE` が未設定、または `live` 以外の値であればデモモードとして動作します。
- **APIキーは不要**です。キーが設定されていても、それだけではClaude APIを呼び出しません。
- 言語とスタイルの組み合わせごとに用意したJSONの固定サンプルを返すため、同じ条件では常に同じ結果になります。
- レスポンスに `"demo": true` を含め、画面にも「Demo応答」と表示します。
- サンプルはフロントエンドとバックエンドで同じ内容を保持し、一致することをテストで確認しています。

```json
{ "result": "固定のサンプル文章", "demo": true }
```

## Claude API連携

| 項目 | FastAPI (`claude_service.py`) | Next.js API Route (`lib/server/aiRoute.ts`) |
|------|-------------------------------|---------------------------------------------|
| 呼び出し方法 | Anthropic SDK (`AsyncAnthropic`) | `fetch` によるHTTP呼び出し |
| モデル | `claude-haiku-4-5-20251001` | 同左 |
| タイムアウト | 30秒（リトライ1回） | 30秒（リトライなし） |

- FastAPIの非同期ルートでイベントループを止めないよう、非同期クライアントを使用しています。
- クライアントは初回呼び出し時に生成するため、アプリケーションの起動にAPIキーは不要です。

実際にClaude APIを呼び出すには、次の2つを**両方**設定します。**API利用料金が発生します。**

```bash
AI_MODE=live
ANTHROPIC_API_KEY=<ご自身のAPIキー>
```

`AI_MODE=live` でキーが未設定の場合は、デモ応答に切り替えず503を返します。

## 入力検証

FastAPI（Pydantic）とNext.js API Routeで、同じルールを適用しています。

| 項目 | ルール |
|------|--------|
| `text` | 必須、前後の空白を除いて1〜10,000文字 |
| `keywords` | 必須、前後の空白を除いて1〜500文字 |
| `source_lang` / `target_lang` / `language` | `Japanese` / `English` / `Chinese` のみ |
| `style` | `blog` / `formal` / `casual` / `technical` のみ |
| 翻訳の言語 | 翻訳元と翻訳先は異なる言語であること |

言語とスタイルを許可リストで制限し、プロンプトに任意の文字列が埋め込まれないようにしています。

## エラー処理

| 状況 | FastAPI | Next.js API Route |
|------|---------|-------------------|
| 入力エラー、不正なJSON | 422 | 400 |
| APIキー未設定、利用不可 | 503 | 503 |
| レート制限 | 503 | 502 |
| タイムアウト | 504 | 504 |
| 接続エラー、上流のエラー、空の応答 | 502 | 502 |
| 想定外のエラー | 500 | 500 |

- 例外の内容や上流のエラー本文はクライアントへ返さず、固定のメッセージのみを返します。
- 入力エラーのレスポンスには、入力値を含めず、項目名とエラー種別のみを含めます。
- ログに記録するのは処理名、エラー種別、HTTPステータスのみです。APIキーやユーザーの入力内容は記録しません。

## ローカルでの起動

### フロントエンド（デモの確認はこれだけで可能です）

```bash
cd frontend
npm install
npm run dev
```

http://localhost:3000 を開きます。環境変数の設定は不要です。

### FastAPIバックエンド（任意）

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows (Git Bash)
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`.env` は不要です。API仕様は http://localhost:8000/docs で確認できます。

フロントエンドからFastAPIへ接続する場合は、`frontend/.env.local` を作成してフロントエンドを再起動します。

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/ai
```

設定項目の詳細は `backend/.env.example` と `frontend/.env.example` を参照してください。

## テスト

テストで実際のClaude APIを呼び出すことはありません。HTTP層はモックに置き換えています。バックエンドのテストでは外部への通信をすべて遮断し、ダミーのキーを使用します。

```bash
# バックエンド
cd backend
pip install -r requirements-dev.txt
pytest

# フロントエンド
cd frontend
npm test            # Vitest
npm run typecheck   # 型チェック
npm run build       # 本番ビルド
```

主な確認項目は次のとおりです。

- 3機能のデモ応答が、すべての言語とスタイルの組み合わせで固定の内容を返すこと
- APIキーが設定されていても、`AI_MODE=live` がなければClaude APIを呼び出さないこと
- 不正な入力を拒否し、入力値をレスポンスに含めないこと
- Claude APIのエラー、タイムアウト、接続失敗を安全なレスポンスに変換すること
- エラーの詳細、入力内容、APIキーがレスポンスとログに含まれないこと
- ブラウザ向けのコードがAPIキーを参照しないこと
