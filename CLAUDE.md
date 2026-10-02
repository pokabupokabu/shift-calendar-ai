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
- Gemini APIキーの扱い（クライアント直接呼び出し vs プロキシ経由）はREADME「8. 不明点・リスク」1番目が未確定。この方針に関わる実装（呼び出し方式の変更など）に着手する前は必ずユーザーに確認する。
- `.env`や実際のAPIキーをコミットしない。

## 開発フロー

- リスクを伴う/方針が未確定な実装に入る前は、軽く実装計画を提示し、必要なら確認を取ってから着手する。
- 変更後は `npm run lint` / `npm run typecheck` / `npm run format` を通す。
- iPhone専用。実機/シミュレータでの確認ができない場合はその旨を明記する。

## 引き継ぎメモ（2026-10-02時点、次セッション向け）

### このプロジェクトの現状

- Expo Router（SDK 57）+ TypeScript製、iPhone専用（Androidは対象外）。シフト表の写真をAIが読み取り、本人のシフトだけを抽出してApple/Googleカレンダーへ登録し、休憩自動控除・深夜/早朝割増を考慮した給与見込みも出せるアプリ。
- ブランチは`claude/admiring-cerf-egbi9t`（`origin`の同名ブランチより3コミット先行、`main`未マージ）。
- 最新コミットは`f4776a4`（「設定タブの未実装機能を仕上げ、カレンダー/テンプレ/スキャン画面を改善」）。**これは今回のセッション前半で実装してその場でコミット済み**。その後に実装した内容（Pro/無料状態の基盤・給与タブの日数修正・複数勤務先プロファイル機能）は**一切コミットされていない**。`git status --short`で24ファイル（変更21・新規3）が変更中のはず。
- ローカル動作確認はExpo Web。`mcp__Claude_Browser__preview_start`に`{url: "http://localhost:8081"}`を渡す方式（`{name: "expo-web"}`は使わない）。**地雷情報は下記「ローカルサーバー・ポートの状態」を必ず読むこと。**
- 実機/シミュレータでの確認は今回も未実施。**このMacにはXcode本体が無く（Command Line Toolsのみ）`xcrun simctl`が使えないためiOSシミュレータ自体が使用不可**（複数セッション前からの既知の制約、フルインストールにはユーザーのパスワードが必要）。

### ローカルサーバー・ポートの状態（毎回踏む地雷、今回も遭遇）

- ポート**8081**で、複数セッション前から動きっぱなしの古いExpoプロセス（PID 75565、`expo start --web --clear`）が今も生きている。**ここに実データ（田中さんの登録・9月のシフト・カレンダー登録済みイベントなど）が入っている。**
- 今回のセッション開始時・セッション中に複数回「Port 8081 is already in use」という自動エラーメッセージが出たが、**プロセスはkillせず**`preview_start`に`{url: "http://localhost:8081"}`を渡して既存プロセスにそのままブラウザで繋ぐ、という対応で毎回解決した。次セッションでも同じ対応でよい。
- スマホ実機での動作確認が必要な場合は、Expo Go（SDK 57からCLI側・アプリ側の両方でExpoアカウントへのログインが必須になった）で同じLAN上から`exp://<MacのIP>:<別ポート>`に接続する方式を過去に使った（詳細は本セッションの会話ログ参照、再現時は`npx expo login`はユーザー本人に実行してもらうこと）。
- `localStorage`の`calendarEvents`等を`javascript_exec`で直接書き換えるのは要注意（過去セッションで実データ消失事故あり）。今回は`isPro`フラグのON/OFF切り替えや検証用ワークプレイスの追加/削除程度の軽微な操作のみ行い、作業後は毎回元の状態（`isPro: false`、テスト用に追加した勤務先の削除）に戻してある。

### 今回のセッションで実装した内容

**① 設定タブ仕上げ＋カレンダー/テンプレ/スキャン改善（コミット`f4776a4`、セッション前半）**

- 設定タブ: アカウント設定（表示名編集・データ初期化）、カレンダー同期の実認証接続、法的/サポート静的ページ、PROペイウォール画面を新規実装。言語項目は削除。Apple CalendarがSDK 57で非推奨APIにより動かなくなっていた不具合も修正（`expo-calendar`の新オブジェクト指向APIに移行）。
- カレンダー: シフト種別バッジを1文字表示に、「カレンダーを見に行く」を連携済みカレンダーから選択できる形に改善。
- テンプレ: 表記整理、深夜/早朝手当UIの見やすさ改善、基本3シフト種別（早番/遅番/夜勤）の名前ロック、シフト種別セット追加のPro化（アイコン選択付きダイアログは実装済みのまま温存）。
- スキャン: 解析前の確認ダイアログ追加、カレンダー登録確認画面のサマリー圧縮、シフト編集画面の刷新。
- 詳細は`git show f4776a4`で確認可能。計画ファイルは実装完了後に次の計画で上書きされたため残っていない。

**② Pro/無料状態の基盤 + 給与タブ修正（セッション後半、未コミット）**

- `UserSettings`に`isPro: boolean`を追加。実際の課金基盤はまだ無いため、**設定→アカウント設定→プロモーションコード欄に`DEVPRO`と入力するとPro化、`DEVFREE`で解除**という開発用の合言葉方式で代用している（本物の課金導入後はこの入力欄を実際の検証ロジックに差し替える前提）。
- 設定タブのプロフィールカードがPro時はオレンジ+Starアイコン+「PRO」バッジに、PROカード・ペイウォール画面もPro時は「ご利用中」表示に変化。
- テンプレタブの「新しいシフト種別を追加」ボタンは、Pro時のみ実際の追加ダイアログを開き、無料時はペイウォールへ誘導する形に変更済み（これは本セッションより前からあった制限だが、`isPro`フラグと正式に連動させた）。
- 給与タブ: 「テンプレート毎の想定給与」→「シフト種別毎の想定給与」に改称。詳細ダイアログの「回数」を正確な「日数」に修正（従来の`count`はイベント件数で、同日複数シフトがあると実際の勤務日数とズレるバグがあった）。時給と給与見込みの間に「1日あたり」の金額を追加。

**③ PROプラン内容のリサーチ（意思決定のみ、コード未反映の項目あり注意）**

ユーザーと一緒に「Grill me」形式で検討し、サブエージェント4体で並列に深掘りリサーチ（SNS・既存シフトアプリのレビュー・日本の掲示板Q&A・海外プロダクト動向）を実施した。価格はシフカレ(¥240)・TimeTree(¥300)・Zaim(¥440〜480、AI OCR搭載)・CamScanner等と比較した結果、**¥300/月に決定**（従来表示の¥380から変更、ただし`settings.tsx`等のUI文言はまだ¥380のままなので**次セッションで反映が必要**）。

決定した新PRO特典（**太字は未コード化、次セッションの実装候補**）:

- シフト種別セット追加（実装済み）
- 複数勤務先プロファイル（実装済み、下記④）
- カレンダー色分け（実装済み、ただし全ユーザー対象でPro限定ではない）
- 広告非表示（**UIのAdPlaceholderはあるが広告SDK自体が未導入、PRO判定による出し分けも未実装**）
- **画像シフト読み取り枠を無料は月4回に制限（PROは無制限）→ 未実装**
- **給与タブの閲覧期間を無料は今月のみに制限（PROは全期間）→ 未実装**

ディープリサーチで見つかった追加候補（優先度順、いずれも未着手）: 1) 扶養の壁（103万/106万/130万円）接近アラート＋複数勤務先の年収自動合算（4系統の調査全てで最有力）、2) 給与明細との自動照合・差額チェック、3) 同じシフトパターンの一括登録・コピー機能（App Storeレビューで強い不満を確認済み）、4) 掛け持ち先同士のダブルブッキング・移動時間不足の自動警告、5) 新しいスキャン結果と前回の差分検知・通知。

**④ 複数勤務先プロファイル機能（セッション終盤、未コミット、`.claude/plans/ui-auqt-cosmic-panda.md`に実装計画が残っている）**

- 新規`Workplace`モデル（`src/models/workplace.ts`）: 時給・シフト種別セット・休憩/手当設定・カレンダー連携先を勤務先ごとに独立して持てるようにした。`User.workplaces`配列 + `activeWorkplaceId`。
- `CalendarEventRecord`/`Shift`に`workplaceId`を追加。`useAppStore.ts`のpersistを**v8→v9にマイグレーション**し、既存データは自動的に「勤務先1」として移行される（動作確認済み）。
- テンプレタブ上部に会社タブの横スクロール切り替えUIを追加。**無料は1社のみ、2社目以降の追加はPro限定**（`isPro`を見てペイウォールへ誘導）。
- 給与計算は勤務先単位で正しく区別するよう修正（同名シフト種別が複数勤務先にあっても混ざらない、`workplaceId + シフト種別名`の複合キーで集計）。
- ブラウザで実際に2社目「コンビニA」を追加し、設定の独立性・Pro/無料ゲーティング・既存データの移行・給与集計の正しさを確認済み。

### 環境変数の状態

`.env`は`.gitignore`済みで安全。今回のセッションでは変更していない（前回確認済みの5キー、`EXPO_PUBLIC_AI_PROVIDER`/`EXPO_PUBLIC_GEMINI_API_KEY`/`EXPO_PUBLIC_GEMINI_MODEL`/`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`は全て設定済みのまま）。

### 次にやること（優先順）

1. `git status --short`で未コミット分（24ファイル）を確認し、ユーザーと相談の上でコミットするか判断する。
2. PRO価格のUI表示を¥380→¥300に更新する（`src/app/(tabs)/settings.tsx`・`src/app/paywall.tsx`・`src/app/settings/account.tsx`など「¥380」で検索して全箇所反映）。
3. 上記③で「未実装」と明記した2項目（月4回スキャン制限、給与タブ閲覧期間を今月のみに制限）を実装するか、ユーザーに次の優先度を確認する。
4. ディープリサーチで見つかった追加候補（特に優先度1位の「扶養の壁アラート」）を実装するか検討する。
5. 広告SDK（AdMob等）の導入自体はまだ意思決定のみで未着手。実装するかどうかの最終確認が必要。
6. 複数勤務先機能の細部（勤務先の並び替え、シフトスキャン時に「どの勤務先として読み取るか」を確認する導線があるとより親切か等）をユーザーと一緒に使ってみて磨き込む余地がある。
7. README.md「8. 不明点・リスク」に残っている項目（Gemini APIキーの扱い方針の最終確定、Google OAuthの実機検証など）は依然未解消。

### Gotchas（今回のセッションで時間を使って分かったこと）

- **RN Web特有のバグ**: 横スクロール`ScrollView`（`horizontal`）をflex列の中に置くと、`style`に`flexShrink: 0`を明示しない限り高さがほぼ0に潰れ、中のテキストが見切れる/重なって見える（テンプレタブの会社タブで発生、修正済み）。今後similarな横スクロールUIを作るときは最初から`flexShrink: 0`を付けること。
- **サブエージェントが「実装してください」と頼んでも、実際には何もファイルを編集せず計画だけを返して終わることがある**（今回Track Aで1回発生、`tool_uses: 0`で気づいた）。並列実装後は必ず各ファイルの`tsc`/`git status`等で実際に変更が反映されているか確認すること。
- Pro/無料の切り替えは`DEVPRO`/`DEVFREE`という合言葉をプロモーションコード欄に入れる方式（本物の課金が無い前提の暫定実装）。ブラウザでテストする際は`localStorage`の`shift-calendar-ai-store`を直接書き換えても同じ効果がある（`state.user.settings.isPro`）。
- AskUserQuestionでの要望収集は、選択肢を複数回に分けて絞り込んでいくより、相手が「もっと候補が欲しい」と言うタイプの場合は思い切って多め（10件超）に一度に提示した方が噛み合う場合がある（本セッションでアカウント設定の追加候補選びで何度か往復した末に判明）。
- `.claude/plans/`配下の計画ファイルは同じファイル名を使い回すと上書きされるため、複数の計画フェーズを経た場合、古い計画の設計根拠は会話ログにしか残らない。重要な意思決定（PROプランの特典リストなど）はこの引き継ぎメモのような永続ファイルに転記しておかないと失われる。

### 今回のセッションで変更したファイル（未コミット分、`f4776a4`は含まない）

**新規**: `src/constants/shiftTypeIcons.ts`, `src/models/workplace.ts`, `src/utils/resolveShiftTypeTone.ts`

**変更**: `src/app/(tabs)/calendar-view.tsx`, `src/app/(tabs)/payroll.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/template.tsx`, `src/app/analyzing.tsx`, `src/app/calendar-confirm.tsx`, `src/app/complete.tsx`, `src/app/paywall.tsx`, `src/app/settings/account.tsx`, `src/app/settings/calendar-connect.tsx`, `src/app/shift-review.tsx`, `src/app/user-match-select.tsx`, `src/components/calendar/month-grid.tsx`, `src/components/calendar/month-list.tsx`, `src/hooks/use-resolved-color-scheme.ts`, `src/models/calendarEvent.ts`, `src/models/index.ts`, `src/models/shift.ts`, `src/models/user.ts`, `src/services/calendar/appleCalendarProvider.ts`, `src/services/calendar/googleCalendarProvider.ts`, `src/store/useAppStore.ts`, `src/store/useShiftSessionStore.ts`, `src/utils/computePayroll.ts`

**参考**: 複数勤務先機能の実装計画は`.claude/plans/ui-auqt-cosmic-panda.md`に残っている。`npx tsc --noEmit` / `npm run lint` / `npm run format`は全てクリーンな状態。
