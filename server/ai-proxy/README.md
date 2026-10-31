# shiftokare-ai-proxy

> 2026-10-23 に、フォルダを `server/gemini-proxy/` から `server/ai-proxy/` へ、Worker の名前を `gemini-shift-proxy` から `shiftokare-ai-proxy` へ変えた。Worker の名前が変わると URL も変わり、シークレットも Worker ごとなので、新しい Worker には `ANTHROPIC_API_KEY`・`APP_SHARED_SECRET`・`RATE_LIMIT_SALT` を入れ直す（KV の名前空間はそのまま使い回す。名前は `gemini-shift-proxy-RATE_LIMIT_KV` のままだが、今もこの Worker が使っているので消さない）。
>
> 2026-10-31 に、古い Worker `gemini-shift-proxy` を消し、この Worker から Gemini の道を外した（Anthropic だけを中継する）。

shift-calendar-ai がAIのAPIキーをクライアントに埋め込まずに済むようにするための、Cloudflare Workers製の薄い透過プロキシ。実体は `src/index.ts` の1ファイルのみ。

アプリ側はAIの会社のURLの代わりにこのWorkerのURLを呼び、実際のAPIキーはこのWorkerのシークレットとしてのみ保持される。

| 道（パス）          | 中継先                                               | 備考                          |
| ------------------- | ---------------------------------------------------- | ----------------------------- |
| `POST /v1/messages` | Anthropic（`https://api.anthropic.com/v1/messages`） | モデルは本文の `model` で指定 |

ほかのパスはすべて404。合言葉（`x-app-secret`）・回数制限・本文の大きさ・画像の枚数を確かめてから中継する。

## デプロイ手順（初回のみ、ここから先はユーザー自身のCloudflareアカウントで実行）

```bash
cd server/ai-proxy
npm install
```

### 1. Cloudflareにログイン

```bash
npx wrangler login
```

ブラウザが開くので、Cloudflareアカウント（未作成なら先に https://dash.cloudflare.com/sign-up で作成）でログインを承認する。

### 2. レート制限用のKV namespaceを作成

```bash
npx wrangler kv namespace create RATE_LIMIT_KV
```

出力される `id = "xxxxxxxx"` を `wrangler.toml` の `REPLACE_WITH_KV_NAMESPACE_ID` 部分に貼り付ける。

### 3. シークレットを設定

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

→ Anthropic Console（https://platform.claude.com/ ）で発行したAPIキーを貼り付ける。**アプリ側（`.env` の `EXPO_PUBLIC_*`）には絶対に入れない。** 未設定のまま `/v1/messages` を呼ぶと 503 を返す。

```bash
npx wrangler secret put APP_SHARED_SECRET
```

→ アプリ側と共有する合言葉。ランダムな文字列を使う（例: `openssl rand -hex 32` で生成）。この値はアプリ側の `.env` の `EXPO_PUBLIC_AI_PROXY_SECRET` にも同じものを設定する。

```bash
npx wrangler secret put RATE_LIMIT_SALT
```

→ **レート制限のキーをハッシュ化するためのソルト。** ランダムな文字列を使う（例: `openssl rand -hex 32` で生成）。**アプリ側には設定しない。Worker だけが持つ値。**

> 🔴 **`APP_SHARED_SECRET` を流用しないこと。** あちらはアプリのJSバンドルに `EXPO_PUBLIC_AI_PROXY_SECRET` として平文で入るため、抜き取った相手が IPv4 の全空間（約43億通り）を総当たりしてハッシュを逆引きできてしまい、ソルトの意味がなくなる。
>
> 🔴 **このシークレットを設定せずにデプロイすると、Worker は 503 を返して動作しない。** ソルト無しで黙ってハッシュを弱めるより、明示的に落とす設計にしてある。

### 4. デプロイ

```bash
npm run deploy
```

成功すると `https://shiftokare-ai-proxy.<あなたのサブドメイン>.workers.dev` のようなURLが出力される。このURLをアプリ側の `.env` の `EXPO_PUBLIC_AI_PROXY_URL` に設定する（末尾に`/`は付けない）。

## ローカルでの動作確認

```bash
npm run dev
```

で `http://localhost:8787` にローカル起動できる（この場合はKVもシークレットもローカルの`.dev.vars`/`--local`モードを使うか、`wrangler dev --remote`で本番のシークレット/KVに繋ぐ）。

## 設定の更新・ロールバック

- APIキーや合言葉を変えたい場合は `npx wrangler secret put <NAME>` を再実行すれば即座に上書きされる。
- レート制限の閾値は `src/index.ts` の `RATE_LIMIT_PER_HOUR`（1時間あたり）と `RATE_LIMIT_PER_MINUTE`（連打対策の1分あたり）を編集して再デプロイする。
- **中継してよいモデルは固定している。** `ANTHROPIC_ALLOWED_MODELS`（`claude-haiku-5-5` / `claude-sonnet-5-5`）。モデル名はクライアントが送ってくるため、ここで絞らないと合言葉を抜いた相手が任意の高価なモデルを指定できてしまう。アプリ側で使うモデルを変えるときは `src/config/env.ts` の既定値とこの集合の**両方**を更新してデプロイすること。片方だけ変えると404で全滅する。
- **Anthropic の道では、本文を読んでから次を確かめる。** JSONとして読めない・`model` が文字列でない・`messages` の形が違う → 400。許可していないモデル → 404。`max_tokens` が `ANTHROPIC_MAX_OUTPUT_TOKENS`（16,000）を超える → 400（1回の呼び出しを桁違いに高くされないため）。画像ブロックが5枚以上 → 413。Anthropic へ送るヘッダーはWorkerが組み立てた3つ（`x-api-key`・`anthropic-version: 2023-06-01`・`content-type`）だけで、アプリから来たヘッダーは1つも渡さない。
- **1リクエストの画像は `MAX_IMAGES_PER_REQUEST`（4枚）まで、本文全体は `MAX_REQUEST_BYTES`（12MB）まで。** アプリ側（`src/app/photo-select.tsx` の `MAX_IMAGES`）でも同じ枚数で制限しているので、変更するときは両方直す。
- **レート制限のキーには生のIPアドレスを保存していない。** `RATE_LIMIT_SALT` を混ぜた SHA-256 のハッシュ（先頭32文字）を KV のキーにしており、保存されるのは `rl:<ハッシュ>:<時刻>` の形。同じIPなら必ず同じハッシュになるためレート制限の精度は変わらず、KV を覗いても元のIPは復元できない。プライバシーポリシーの「個人を特定できる形では保存しない」という記述はこの実装が根拠になっている。
