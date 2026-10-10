# gemini-shift-proxy

shift-calendar-ai がGemini APIキーをクライアントに埋め込まずに済むようにするための、Cloudflare Workers製の薄い透過プロキシ。実体は `src/index.ts` の1ファイルのみ。

アプリ側は `https://generativelanguage.googleapis.com/...` の代わりにこのWorkerのURLを呼び、実際のGemini APIキーはこのWorkerのシークレットとしてのみ保持される。

## デプロイ手順（初回のみ、ここから先はユーザー自身のCloudflareアカウントで実行）

```bash
cd server/gemini-proxy
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
npx wrangler secret put GEMINI_API_KEY
```

→ Google AI StudioまたはGoogle Cloud ConsoleでGeminiのAPIキーを発行し、それを貼り付ける（今まで`.env`の`EXPO_PUBLIC_GEMINI_API_KEY`に入っていたものと同じ値でよい）。

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

成功すると `https://gemini-shift-proxy.<あなたのサブドメイン>.workers.dev` のようなURLが出力される。このURLをアプリ側の `.env` の `EXPO_PUBLIC_AI_PROXY_URL` に設定する（末尾に`/`は付けない）。

## ローカルでの動作確認

```bash
npm run dev
```

で `http://localhost:8787` にローカル起動できる（この場合はKVもシークレットもローカルの`.dev.vars`/`--local`モードを使うか、`wrangler dev --remote`で本番のシークレット/KVに繋ぐ）。

## 設定の更新・ロールバック

- APIキーや合言葉を変えたい場合は `npx wrangler secret put <NAME>` を再実行すれば即座に上書きされる。
- レート制限の閾値は `src/index.ts` の `RATE_LIMIT_PER_HOUR` を編集して再デプロイする。
- **レート制限のキーには生のIPアドレスを保存していない。** `RATE_LIMIT_SALT` を混ぜた SHA-256 のハッシュ（先頭32文字）を KV のキーにしており、保存されるのは `rl:<ハッシュ>:<時刻>` の形。同じIPなら必ず同じハッシュになるためレート制限の精度は変わらず、KV を覗いても元のIPは復元できない。プライバシーポリシーの「個人を特定できる形では保存しない」という記述はこの実装が根拠になっている。
