# scripts/

## build-site.mjs — 法務文書の静的サイト生成

### 目的

App Store Connect の必須項目である**プライバシーポリシーURL**と**サポートURL**を用意するため、アプリ内に持っている法務文書を、そのままWebで公開できる静的HTMLとして書き出す。

### 文言の出典は `src/constants/legalContent.ts` の1箇所だけ

このスクリプトは `LEGAL_PAGES` を動的importでそのまま読み込み、**本文を1文字も書き換えずに**HTMLのタグで囲むだけを行う。

- 文言を直すときは `src/constants/legalContent.ts` を直す。生成されたHTMLを直接編集しない（次回の生成で消える）
- アプリ内の表示（`src/app/settings/legal/[slug].tsx`）とWeb版が、常に同じ原文から作られる状態を保つのが狙い
- 本文に対して行うのは次の整形だけで、いずれも文字そのものは変えない
  - 空行（`\n\n`）で段落に分ける / 段落内の改行は `<br>`
  - `・` で始まる連続行を `<ul><li>` にまとめる（`・` の記号だけを削る）
  - 「1. 」「第1条（…）」「(1) 」で始まる短い行を見出し（`<h2>` / `<h3>`）にする
  - HTMLエスケープ（`&` `<` `>` `"`）と、メールアドレスの `mailto:` リンク化

### 実行方法

```sh
npm run build:site
```

出力先は `web/`（実行ごとに作り直す）。生成されるのは次の6ファイル。

| ファイル             | 内容                           |
| -------------------- | ------------------------------ |
| `web/index.html`     | 5ページへのリンク集            |
| `web/privacy.html`   | プライバシーポリシー           |
| `web/terms.html`     | 利用規約                       |
| `web/tokushoho.html` | 特定商取引法に基づく表記       |
| `web/contact.html`   | お問い合わせ（サポートページ） |
| `web/faq.html`       | ヘルプ・よくある質問           |

`web/` は生成物なので `.gitignore` 済み。コミットしない。

### 技術的なメモ

- 外部のCSS・JS・フォントを**一切読み込まない**。CSSは各HTMLにインラインで埋め込んである。そのままCloudflare Pagesに置けば動く
- ダークモードは `prefers-color-scheme` で切り替わる
- TypeScriptのまま読めているのは、Node 24 のネイティブな型除去（type stripping）が効いているため。`legalContent.ts` は外部依存ゼロの自己完結ファイルなので、esbuild などのバンドラは不要
- `MODULE_TYPELESS_PACKAGE_JSON` という無害な警告が出るため、`npm run build:site` は `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON` で実行している。Expo側への影響を避けるため `package.json` に `"type": "module"` は足していない

### トップページと Google の OAuth 審査

Google カレンダー連携（`calendar.events`）の審査では、ホームページに「アプリの機能の説明」と「プライバシーポリシーへのリンク」が要る。そのためトップページ（`web/index.html`）には、`APP_FEATURES` の「できること」とページへのリンク集を置いている。`APP_FEATURES` は App Store の説明文と同じ範囲で、実装済みの機能だけを書く。

Google Search Console の所有権の確認（HTMLタグの方法・URL プレフィックスのプロパティ `https://shiftokare.pages.dev/`）のタグは、トップページにだけ入る。Search Console で発行された `content` の値（2026-10-31 発行）を `GOOGLE_SITE_VERIFICATION` の既定値として持っている。Google は確認後も定期的にタグを見に来るので、消さないこと。値を差し替えるときは環境変数で上書きできる。

```sh
GOOGLE_SITE_VERIFICATION=<新しい content の値> npm run build:site
```

- `LEGAL_PAGES` にページを足したのに `PAGE_ORDER` に足し忘れた場合は、黙って取りこぼさずにエラーで止まる

### デプロイ

Cloudflare Pages のプロジェクト **`shiftokare`**（https://shiftokare.pages.dev/ 。2026-10-31 に初回公開）。公開は、生成結果を人が確認してから行う。

```sh
npm run build:site
npx --prefix server/ai-proxy wrangler pages deploy web --project-name shiftokare --branch main
```

`wrangler` は `server/ai-proxy` に入っているものを使う（AIの中継サーバーと同じ Cloudflare のアカウント）。Cloudflare Pages は `.html` を付けないURLに自動で寄せるので、外に書くURLは `.html` なしの形にする。

| 使う所                                        | URL                                  |
| --------------------------------------------- | ------------------------------------ |
| App Store Connect のプライバシーポリシーURL   | https://shiftokare.pages.dev/privacy |
| App Store Connect のサポートURL               | https://shiftokare.pages.dev/contact |
| App Store の説明文の利用規約                  | https://shiftokare.pages.dev/terms   |
| Google の同意画面のホームページ               | https://shiftokare.pages.dev/        |
| Google の同意画面のプライバシーポリシー・規約 | `/privacy`・`/terms`                 |

独自ドメインは取らずに Google の審査を申請し、ドメインが理由で却下されたときだけ考え直す（2026-10-31 ユーザー決定。Google の手引きは「ドメインプロパティ（DNS）で確認」と定めており、`*.pages.dev` では通らないおそれがあることは伝えたうえで）。
