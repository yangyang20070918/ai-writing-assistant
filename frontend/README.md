# AI Writing Assistant - フロントエンド

Next.js (App Router) + TypeScript で実装したフロントエンドです。
プロジェクト全体の説明は[ルートのREADME](../README.md)を参照してください。

現在のデモでは、API利用料金を発生させないため、固定のサンプルレスポンスを使用しています。実際のClaude API呼び出しは行いません。

## 起動

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。環境変数とバックエンドの起動は不要です。

## コマンド

| コマンド | 内容 |
|----------|------|
| `npm run dev` | 開発サーバーの起動 |
| `npm run build` | 本番ビルド |
| `npm start` | 本番サーバーの起動 |
| `npm test` | テストの実行（Vitest、外部通信なし） |
| `npm run typecheck` | 型チェック |

## 環境変数

すべて任意です。詳細は `.env.example` を参照してください。

| 変数 | 参照元 | 内容 |
|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | ブラウザ | APIの接続先。未設定時は内蔵のAPI Route（`/api/ai`）。値はビルド時に埋め込まれます |
| `AI_MODE` | サーバーのみ | `live` の場合のみClaude APIを呼び出します。それ以外はデモモードです |
| `ANTHROPIC_API_KEY` | サーバーのみ | `AI_MODE=live` の場合に使用します。`NEXT_PUBLIC_` を付けないでください |

## 主なファイル

| パス | 内容 |
|------|------|
| `app/translate`, `app/summarize`, `app/generate` | 各機能の画面 |
| `app/api/ai/*/route.ts` | API Route |
| `lib/api.ts` | ブラウザ側のAPIクライアント |
| `lib/server/aiRoute.ts` | デモモードとClaude API呼び出しの切替（サーバー専用） |
| `lib/server/validation.ts` | 入力検証（サーバー専用） |
| `lib/demo-responses.json` | デモ用の固定サンプル |
