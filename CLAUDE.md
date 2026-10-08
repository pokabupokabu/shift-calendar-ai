@AGENTS.md

# shift-calendar-ai プロジェクト指示

## 言語

- 基本的に全てのやり取り（説明・確認事項・進捗報告など）は日本語で行うこと。コミット/PRの文面も日本語を基本とする。
- 実装計画（プランモードの計画書）や進捗メモなど、ユーザー向けに作成する内部文書も同様に日本語で書くこと。

## プロダクト概要

- シフト表の写真をAIが読み取り、本人のシフトだけを抽出してApple/Googleカレンダーへ登録するiPhone専用アプリ（Androidは対象外）。
- 作業前に README.md（技術選定・実装状況・フェーズ順序・不明点/リスク）と docs/requirements.md（要件定義書）に必ず目を通し、全体像を把握してから着手する。

## 開発原則（要件定義書24節・README該当節に対応）

- AI解析結果は必ず構造化JSON（`ShiftAnalysisResult`）で返す。本人特定・シフト種別などが曖昧な場合、AIにもアプリにも勝手に確定させない。`userMatch`が`ambiguous`/`not_found`の場合は候補提示に倒す。
- `confidence`は内部保持のみ。UIには「要確認」等の定性的表現だけを出し、数値は表示しない。
- `AIProvider`（`src/services/ai`）・`CalendarProvider`（`src/services/calendar`）はAdapterとして扱い、共通interfaceに特定モデル/SDK固有の形を漏らさない。Apple CalendarとGoogle Calendarの実装は分離したまま保つ。
- README「7. MVPの最小実装順序」のフェーズ順を尊重し、MVPスコープ外（要件定義書24節「OUT」）の機能を先回りして実装しない。

## セキュリティ・環境変数

- `EXPO_PUBLIC_*`はJSバンドルに平文で埋め込まれる。書き込み権限や従量課金が発生するシークレットは絶対に入れない。
- Gemini APIキーの扱いはプロキシ経由に確定済み（`server/gemini-proxy/`のCloudflare Workers）。クライアントは`EXPO_PUBLIC_AI_PROXY_URL`/`EXPO_PUBLIC_AI_PROXY_SECRET`のみ持ち、実際のGemini APIキーはWorker側のシークレットにのみ存在する。詳細はREADME「8. 不明点・リスク」1番目。
- `.env`や実際のAPIキーをコミットしない。

## 開発フロー

- リスクを伴う/方針が未確定な実装に入る前は、軽く実装計画を提示し、必要なら確認を取ってから着手する。
- 変更後は `npm run lint` / `npm run typecheck` / `npm run format` を通す。
- iPhone専用。実機/シミュレータでの確認ができない場合はその旨を明記する。

## 引き継ぎメモ（2026-10-03 13:49時点、次セッション向け）

### このプロジェクトの現状

- Expo Router（SDK 57）+ TypeScript製、iPhone専用（Androidは対象外）。シフト表の写真をAIが読み取り、本人のシフトだけを抽出してApple/Googleカレンダーへ登録し、休憩自動控除・深夜/早朝割増を考慮した給与見込み・Pro課金・広告も備えるアプリ。
- ブランチは`claude/admiring-cerf-egbi9t`。**`origin`と完全に同期済み（`git status`クリーン、`git log origin/..HEAD`も空）、`main`は未マージ。**
- 最新コミットは`9ae8810`（「Pro決済・広告SDK・画像リサイズ・権限エラー表示・リワード広告を実装」）。
- サブプロジェクトとして`server/gemini-proxy/`（Cloudflare Workers、Gemini APIキーをクライアントから隠す薄いプロキシ）があり、**デプロイ済み・動作確認済み**: `https://gemini-shift-proxy.shift-calendar-ai.workers.dev`
- ローカル動作確認はExpo Web。`mcp__Claude_Browser__preview_start`に`{url: "http://localhost:8081"}`を渡す方式（`{name: ...}`は使わない）。**地雷情報は下記「ローカルサーバー・ポートの状態」を必ず読むこと。**
- 実機/シミュレータでの確認は今回も未実施。**このMacにはXcode本体が無く（Command Line Toolsのみ）`xcrun simctl`が使えないためiOSシミュレータ自体が使用不可**（複数セッション前からの既知の制約、フルインストールにはユーザーのパスワードが必要）。実機検証にはEAS Build必須（後述ロードマップ参照）。

### 全体ロードマップ（ユーザーと合意済み、ストア公開までの流れ）

フェーズA(技術方針確定) → フェーズC(残りMVP機能) → UI改善 → **フェーズD(ストア掲載準備・ビルド不要部分) ← 今ここ** → 初回EAS Build → フェーズB(実機検証) + フェーズDの残り(スクショ撮影) → フェーズE(ベータ→審査提出)

- フェーズA: 完了（Gemini APIキーのプロキシ化、Google OAuthクライアントID確認）
- フェーズC: ほぼ完了（Pro決済・広告SDK・画像リサイズ・権限エラー表示・リワード広告実装済み）
- **UI改善: 完了（本セッションでaccount.tsx・calendar-connect.tsx・template.tsxを実装、コミット`ba47cab`、push未実施）**
- **フェーズD: 着手中。Apple Developer Program登録は本セッションでユーザーが完了させ、現在Apple側の承認待ち**（年間$99、個人/法人どちらで登録したかは未確認。承認が下り次第App Store Connectでのアプリレコード作成に進める）
- フェーズB・E: 未着手（フェーズBの前提はApple Developer Program承認）

### 直前に完了したUI改善3点（コミット`ba47cab`、詳細は`git show ba47cab`）

1. [src/app/settings/account.tsx](src/app/settings/account.tsx): 全5セクションをCard+IconBadgeパターンに統一（表示名=青/User、プラン=オレンジ/Star、扶養の壁アラート=紫/TriangleAlert、プロモーションコード=neutral/Tag、データの初期化=赤/Trash2）。
2. [src/app/settings/calendar-connect.tsx](src/app/settings/calendar-connect.tsx): 中央の空白にCard+大きめIconBadge(CalendarCheck)+説明文、下部に「権限は後からいつでも変更できます」の注記行を追加。Apple=neutralトーン、Google=blueトーンで視覚的に区別。
3. [src/app/(tabs)/template.tsx](<src/app/(tabs)/template.tsx>)の`premiumRow`/`premiumTimeLabel`: 時間レンジテキストに`flexShrink:1`/`minWidth:0`、ドット・`+25%`バッジ側に`flexShrink:0`を付与し、画面が狭い時にレイアウトが崩れず正しく`...`で省略されるよう修正。375px/390px幅で確認済み。

lint/typecheck/format全てクリーンな状態でコミット済み。**pushはまだ行っていない**（ユーザーへの確認待ちのまま次の話題＝Apple Developer Program登録に進んだため）。

### ローカルサーバー・ポートの状態（毎回踏む地雷）

- ポート**8081**で、複数セッション前から動きっぱなしの古いExpoプロセス（PID 75565、`expo start --web --clear`）が今も生きている。**ここに実データ（田中さんの登録・シフト・カレンダー登録済みイベントなど）が入っている。**
- 新しいセッションでは毎回「Port 8081 is already in use」という自動エラーメッセージが出るが、**プロセスはkillせず**`preview_start`に`{url: "http://localhost:8081"}`を渡して既存プロセスにそのままブラウザで繋ぐ、という対応で毎回解決する。次セッションでも同じ対応でよい。
- 稀に「Disconnected from Metro (1006)」という警告がコンソールに出ることがあるが、プロセス自体は生きていることが多く、ページをreloadすれば再接続できる（今回実際に発生し、reloadで解消した）。
- `localStorage`の`calendarEvents`等を`javascript_exec`で直接書き換えるのは要注意（過去セッションで実データ消失事故あり）。`isPro`フラグのON/OFF切り替えや検証用ワークプレイスの追加/削除程度の軽微な操作に留め、作業後は毎回元の状態（`isPro: false`等）に戻すこと。

### 今回のセッションで実装した内容（すべてコミット・push済み）

**① Gemini APIキーのプロキシ化（コミット`8b19853`）**: README「8. 不明点・リスク」1番目を解消。`server/gemini-proxy/`にCloudflare Workersの透過プロキシを新設し、実際のGemini APIキーはWorker側のシークレットにのみ存在する形にした。クライアントは`EXPO_PUBLIC_AI_PROXY_URL`/`EXPO_PUBLIC_AI_PROXY_SECRET`のみ保持。共有シークレットヘッダー+IPベースの簡易レート制限（30回/時）で乱用を防止。デプロイ・動作確認（curlで401/401/400-from-Google応答を確認）済み。

**② スキャン時の勤務先確認導線（コミット`5afdc87`）**: 複数勤務先ユーザーが写真選択時に「どの勤務先として読み取るか」を確認・選択できるダイアログを追加（`useShiftSessionStore`に`scanWorkplaceId`追加）。

**③ 無料プランの利用制限（コミット`dea7df5`）**: 画像シフト読み取りを無料は月4回に制限（`scanQuota.ts`）。給与タブの前月/翌月ボタンは無料プランだとペイウォールへ誘導し当月のみ閲覧可能に。

**④ PRO価格表示修正（コミット`9ce80f9`）**: ¥380→¥300の反映漏れを修正。

**⑤ 扶養の壁アラート（コミット`6394b7c`）**: 103万/106万/130万円の壁までの残り額を、全勤務先合算の暦年収見込みから算出してPRO限定で表示。無料ユーザーにはペイウォール誘導のティーザーカード。

**⑥ Pro決済・広告SDK・画像リサイズ・権限エラー表示・リワード広告（コミット`9ae8810`、最大のまとまり）**:

- **Pro決済**: RevenueCat（`react-native-purchases`）導入。`paywall.tsx`に実際の購入・復元フローを実装。**ただしRevenueCat側のAPIキー（`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`）・「pro」エンタイトルメント・App Store Connect側のサブスク商品はいずれも未設定のため現状は未稼働**（コードのみ存在、Webでは安全にフォールバック表示することは確認済み）。既存の開発用合言葉（`DEVPRO`/`DEVFREE`、設定→アカウント設定）は引き続き有効。
- **広告SDK**: `react-native-google-mobile-ads`導入。`AdPlaceholder`をプラットフォーム別ファイル分割（`.tsx`=Web用プレースホルダー、`.native.tsx`=実バナー）。Pro時は非表示、無料時はGoogle公式テストIDで実バナー表示。**本番配信前に実際のAdMobアカウント・ad unit IDへの差し替えが必要**（`app.json`の`iosAppId`も含む）。
- **リワード広告**: 無料プランが月4回の上限に達した際、`rewardedAd.native.ts`経由で広告視聴するとボーナススキャンを獲得できる（月5回まで、`MAX_BONUS_SCANS_PER_MONTH`）。`scanQuota.ts`に`bonusScans`追加、ストアをv10→v12にマイグレーション。
- **画像リサイズ**: `resizeShiftImage.ts`で長辺2000px超の画像のみ送信前に`expo-image-manipulator`で縮小。
- **権限エラー表示**: 写真選択画面でカメラ/ライブラリへのアクセス拒否時にAlert表示を追加。

**⑦ 対応カレンダー拡充の市場調査（コード変更は案内文のみ、コミット`9ae8810`に含む）**: サブエージェント多数（TimeTree・LINE・Jorte・Lifebear・caho・Potluck等14候補）を並列投入し、ユーザー層親和性と外部書き込みAPI有無を調査。**結論: Apple/Google以外に直接連携できる候補は無かった**（Outlook/Microsoft 365のみ技術的には可能だがターゲット層が合わず対象外）。代わりに、Fantastical・Lifebear等はGoogle Calendar経由の間接反映が公式に可能と判明したため、`calendar-providers.tsx`とFAQ（`legalContent.ts`）に案内文を追加するだけで対応完了とした。

**⑧ Google OAuthクライアントIDの状況確認**: README記載「未発行」は誤りで、**既にGoogle Cloud Console（プロジェクト`shift-calendar-ai`、クライアント名`shift-calendar-ai-ios`）で発行済み**と判明。ただし公開ステータスが「テスト中」のままで、登録済みテストユーザー（`pensuke1234@gmail.com`、ユーザー確認済み・本人のテスト用アカウント）以外はサインインできない。本番公開（Google審査が必要になる可能性あり）は、フェーズB（実機検証）が終わってから着手する方針で合意済み。

### 環境変数の状態

`.env`は`.gitignore`済みで安全。設定済みキー: `EXPO_PUBLIC_AI_PROVIDER` / `EXPO_PUBLIC_GEMINI_API_KEY`(未使用になったが残存) / `EXPO_PUBLIC_GEMINI_MODEL` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`(未使用のまま) / `EXPO_PUBLIC_AI_PROXY_URL` / `EXPO_PUBLIC_AI_PROXY_SECRET`。

**未設定（`.env.example`には項目だけ存在）**: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — RevenueCatアカウント作成後に設定が必要。

### 次にやること（優先順）

1. **UI改善3点のコミットをpushするか確認**: `ba47cab`はローカルコミット済み・push未実施のまま、Apple Developer Program登録の話題に移った。次セッション開始時にpush意思を確認すること。
2. **Apple Developer Program承認待ちの状況確認**: 承認が下りたらApp Store Connectでのアプリレコード作成に進む。承認メールが来ているか、却下されていないかをユーザーに確認。
3. 利用規約・プライバシーポリシー・特定商取引法に基づく表記の実文書化（`src/constants/legalContent.ts`は現状全てダミー文言。特定商取引法の表記は販売事業者名・住所等、**ユーザー本人の実在情報が必要**なので先回りして書かないこと。Apple Developer Program登録時に入力した氏名・住所を流用できる可能性がある）。承認待ちの間でも並行して着手できる。
4. 初回EAS Build実行（`eas-cli`未導入、`eas.json`未作成の状態から）。
5. フェーズB(実機検証)本体: Apple Calendar権限フロー、Google OAuth実機サインイン、上書き判定、RevenueCat/AdMobの実アカウント接続後の動作確認。
6. フェーズDの残り: 実機ビルドからのスクリーンショット撮影。
7. フェーズE: TestFlightベータ→App Store審査提出。

### Gotchas（今回のセッションで時間を使って分かったこと）

- **サブエージェントが「結果が揃い次第報告する」という計画の説明だけを返して、実際には何も調査せず終了することがある**（今回の「20代女性向け予定共有アプリ発掘調査」エージェントで発生）。`SendMessage`で同じエージェントに「計画ではなく実際に調査を実行して」と再指示すれば立て直せる。背景タスクの結果は鵜呑みにせず、「実際に情報源URLが列挙されているか」等で実質的な中身の有無を確認すること。
- **自分で挙げた調査対象が実在しないことがある**（「メルカリグループのPotluck」という候補を記憶頼りで挙げたが、調査の結果、実在しない組み合わせと判明。ユーザーには正直に訂正を伝えた）。確信が持てない固有名詞は、リサーチ対象として挙げる前にその存在自体を疑うこと。
- Google Cloud Consoleは、ブラウザの`preview_start`で開いたタブがユーザーの実アカウントにログイン済みの状態で繋がる（Cloudflareのwrangler loginとは違い、ユーザーに別途ログインしてもらう必要がなかった）。
- RevenueCatの`Purchases.configure()`は、iOS単体アプリでは`store`パラメータを**渡さない**（`store`はAndroidの複数ストア選択用で、省略時はApp Storeが暗黙のデフォルトになる。`store: 'APP_STORE'`を渡すと型エラーになる）。
- `react-native-google-mobile-ads`・`react-native-purchases`はいずれもWeb実装が無いため、`.tsx`（Web用no-op/フォールバック）と`.native.tsx`（実装）にファイルを分割するパターンで対応した（Metroの拡張子解決に依存、tsconfigの`moduleSuffixes`相当の設定は不要だった）。

### 今回のセッションで変更したファイル（全てコミット・push済み、詳細は`git show <コミットハッシュ>`参照）

**新規**: `server/gemini-proxy/`一式, `src/utils/scanQuota.ts`, `src/components/ad-placeholder-sizes.ts`, `src/components/ad-placeholder.native.tsx`, `src/constants/purchases.ts`, `src/utils/prepareAds.ts`/`.native.ts`（旧`initAds`、ATT対応時にリネーム）, `src/utils/purchases.ts`/`.native.ts`, `src/utils/resizeShiftImage.ts`, `src/utils/rewardedAd.ts`/`.native.ts`

**主な変更**: `src/app/photo-select.tsx`, `src/app/paywall.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/payroll.tsx`, `src/app/settings/calendar-providers.tsx`, `src/components/ad-placeholder.tsx`, `src/config/env.ts`, `src/constants/legalContent.ts`, `src/store/useAppStore.ts`, `README.md`, `app.json`, `.env.example`

`npx tsc --noEmit` / `npm run lint` / `npm run format`は全てクリーンな状態（UI改善3点は未着手なのでこのクリーン状態を維持したまま次セッションを開始できる）。
