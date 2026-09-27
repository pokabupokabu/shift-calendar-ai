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

## 引き継ぎメモ（2026-09-26 23時台時点、次セッション向け）

### このプロジェクトの現状

- 最新コミットは`38d40eb`（前セッション「5タブ画面のUIフィードバック」の成果）。**今回のセッション（本メモが対象とする範囲）の変更は一切コミットされていない。** `git status --short`で全体像を確認してから着手すること（現在: 変更20ファイル・新規4ファイル）。
- ブランチは`claude/admiring-cerf-egbi9t`（`main`にはまだマージされていない）。
- ローカル動作確認はExpo Web（ブラウザの`navigate`で`http://localhost:8081`を直接開く方式）で行っている。**重要: 開発サーバーのポートまわりの地雷は前セッションから継続中、下記を必ず読むこと。**
- 今回のセッションは大きく2部構成：①カレンダー/テンプレ/給与/設定タブへの細かいUIフィードバック対応、②ユーザーがGoogle Stitch（AI UIデザインツール）で作った10画面分のモックアップを、実際のHTML/Tailwindソースコードをそのまま根拠にして正確に反映する大規模ビジュアル改修。プランモードを2回使用（②の一部）。

### ローカルサーバー・ポートの状態（今回も踏んだ地雷、要注意）

- ポート**8081**で、複数セッション前から動きっぱなしの古いExpoプロセス（PID 75565）が今も生きている。**ここに実際のテストデータ（田中さんの登録・9月のシフト・カレンダー登録済みイベントなど）が入っている。**
- `.claude/launch.json`は`"autoPort": false`のまま（前セッションの対策が維持されている）。**次セッションでの正しい動き方は変わらず**: `preview_start`は使わず、ブラウザの`navigate`で直接`http://localhost:8081`を開くこと。
- **今回新たに踏んだ事故**: `もっと見る`ボタンの動作確認のため、`javascript_exec`でテスト用シフトを6件追加した後、`id`が`test-`で始まるものだけ除外するはずのフィルタが誤作動し、**実データ2件も含めて`calendarEvents`が全消去される事故が発生した**。ユーザーの許可を得て、日付・時間帯・シフト種別だけを記憶から再現した代替データ（`id`は`restored-1`/`restored-2`、元の`externalEventId`等の内部IDは失われている）で復元済み。今後、`calendarEvents`配列を書き換えるようなフィルタ処理を`javascript_exec`で組むときは、実行前に必ず一度中身をログ出力して確認してから適用すること。
- PID 75565は今回も`kill`していない（ユーザーの明示許可が必要な操作のため）。

### 今回のセッションで実装した内容

**① 細かいUIフィードバック対応（コミット`38d40eb`以降、Stitch改修より前）**

- カレンダー: 日付セル内の「早/早…」表示ゆれを修正（日付が1桁か2桁かで残り幅が変わっていたのが原因。`dateNumber`に`minWidth`を固定）。
- テンプレ: 給与形態を時給/日給で表示切替、休憩時間（6h→45分/8h→60分、編集可）・深夜手当・早朝手当をON/OFFスイッチ＋編集ダイアログ形式で追加。`UserSettings`に`breakDeductionEnabled`/`breakRules`/`lateNightPremium`/`earlyMorningPremium`を追加（store migration v3→v5）。「カレンダーにはこう登録される」プレビューは削除。全編集項目を「値表示＋鉛筆編集ボタン→ダイアログ」形式に統一。
- 給与: 「出勤履歴」→「簡易明細一覧」に改称。シフト種別フィルタ・昇順/降順切替・「もっと見る」ページネーション（初期5件）・出勤詳細ダイアログ（実働時間/休憩時間込み）・テンプレート毎の想定給与カードのプルダウンフィルタ＋タップ詳細を追加。`computePayroll.ts`に休憩控除・深夜/早朝手当を考慮した`computeShiftBreakdown`を実装。
- 給与計算ロジックの数値検算は本セッション中に確認済み（休憩控除後の実働時間×時給で一致）。

**② Stitchモックアップの正確な反映（今回のセッションの主眼、`.claude/plans/stitch-wondrous-globe.md`に詳細計画あり）**

- 経緯: 最初に画像の内容を文章で説明してサブエージェント7体に並列実装させたところ、ユーザーから「1割も反映されていない」との指摘。**文章経由では色・余白・フォントの精度が全く再現できないと判明。** ユーザーから10画面分の実際のHTML/Tailwindソースを受け取り、それをそのままサブエージェントのプロンプトに埋め込んで再実装させたところ、大幅に精度が向上（自分の目でブラウザ確認済み）。
- **共有デザイントークンの刷新**（自分で実施、`src/constants/theme.ts`）: 配色をStitchモックアップの実値に合わせて全面更新。特に**`background`（ページ背景）と`backgroundElement`（カード背景）の関係が反転**した点に注意（旧: 背景=白/カード=薄グレー → 新: 背景=薄グレー`#F2F2F7`/カード=白`#FFFFFF`）。`primary`も`#208AEF`→`#007AFF`（本物のiOSブルー）に変更。`IconBadgeTones`（丸い色付きアイコン背景、`src/components/icon-badge.tsx`+`src/hooks/use-icon-badge-colors.ts`）を新設。`Typography`にiOS標準スケール（headline/subheadline/footnote/caption1/caption2/title1/title2/title3/body/largeTitleMobile）を追加、`ThemedText`の`type`propを`keyof typeof Typography`に拡張。
- **外観（ライト/ダーク/システム）の実装**: `UserSettings.themeOverride`を追加（store migration v6）、`src/hooks/use-resolved-color-scheme.ts`を新設し`useTheme()`がこれを参照するように変更。設定タブに実際に動くインラインの3択スイッチとして実装済み（ブラウザで動作確認済み）。
- **10画面すべてを個別のサブエージェントに実HTML付きで再実装させ、完了後に自分で全画面をブラウザ操作して目視確認**（前回サボった検証を今回はきちんと実施）: 写真選択・解析中・候補選択・抽出結果確認・シフト編集・登録完了・カレンダー（月表示+新規リスト表示切替+日付詳細シート）・給与・テンプレ・設定。
- 明示的に守った制約: ①一致度98%のような数値のAI確信度は非表示（既存ルール、qualitativeな「推奨」バッジのみ）、②カレンダーの「シフト申請」機能は実装しない（ユーザーが却下済み）、③完了画面にメールアドレス等の架空データは追加しない、④設定のバージョン表示は`Constants.expoConfig?.version`の実データを使用、⑤PRO価格¥380/月は表示のみで課金ロジックには繋がない。
- **カレンダーの新機能**: 月表示⇄リスト表示の切替（`src/components/calendar/month-list.tsx`新設）、日付詳細シートに実働時間・休憩時間・基本時給・給与見込み・外部連携ステータス・編集/削除ボタンを追加（`removeCalendarEvent`アクションを`useAppStore.ts`に新設）。

### 環境変数の状態

`.env`は`.gitignore`済みで安全。今回のセッションでは変更していないが、**前回の引き継ぎメモとの食い違いを1点発見**:

- `EXPO_PUBLIC_AI_PROVIDER`: 設定済み
- `EXPO_PUBLIC_GEMINI_API_KEY`: 設定済み
- `EXPO_PUBLIC_GEMINI_MODEL`: 設定済み
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: 設定済み
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: **設定済みに変わっていた**（前回の引き継ぎメモでは「未設定」と書かれていた）。いつ・誰が設定したのか本セッションでは確認できていない。次セッションでユーザーに経緯を確認するとよい（Web版OAuth対応を始めた形跡はコード上ない）。

### 次にやること（優先順）

1. `git status --short`で今回の全変更（20ファイル変更+4ファイル新規）を確認し、ユーザーに内容を説明した上でコミットするか相談する。
2. Stitch改修で細部の色をエージェントが独自判断した箇所（例: 遅番のプリセットアイコンが本来オレンジ系のところ紫系になっている等）をユーザーと一緒に見直すか確認する。
3. 候補選択画面（`user-match-select.tsx`）は実際のAI解析（複数候補が返るケース）を通していないため、複数候補が表示された状態の見た目は未確認。実際の写真スキャンで確認するとよい。
4. カレンダー連携（`/settings/calendar-providers`・`/settings/calendar-connect`）の実認証実装はまだ未着手（前セッションからの持ち越し）。今も画面遷移のみのモックで、`authenticate()`/`requestCalendarPermission()`は繋がっていない。
5. README.md「8. 不明点・リスク」に残っている項目（Gemini APIキーの扱い方針の最終確定、Google OAuthの実機検証など）の状況を反映するか確認する。
6. 実機/シミュレータでの見た目確認は未実施。**このMacにはXcode本体が入っておらず（Command Line Toolsのみ）、`xcrun simctl`が使えないためiOSシミュレータ自体が使用不可**（前セッションから継続、Xcodeのフルインストールにはユーザーのパスワードが必要）。

### Gotchas（今回のセッションで時間を使って分かったこと）

- **UIモックアップの反映はプロンプトでの文章説明では精度が出ない。実際のHTML/CSS/デザインツールのエクスポートコードを渡すこと。** これが今回最大の教訓。文章だと「なんとなくそれっぽい」止まりになり、ユーザーには「ほぼ反映されていない」ように見える。
- **並列サブエージェントが同時にlint/typecheckを走らせると、他のエージェントがまだ編集中のファイルを一時的にエラーとして拾うことがある**（実際のバグではない）。全エージェント完了後に自分で通しのlint/typecheck/formatを走らせて確認すること。
- **`read_console_messages`は同じブラウザタブを使い回すと過去のエラー履歴が溜まり続ける**（HMRで一時的に壊れた状態のエラーが後から見ても残っている）。コンソールエラーを見つけたら、新しいタブで再現するか確認してから本物のバグと判断すること（今回も何度か「エラーだ」と思ったら過去の残骸だった）。
- **`localStorage`の`calendarEvents`を書き換えるスクリプトは特に慎重に**。フィルタ条件を間違えると実データごと消える（今回発生済み、詳細は上記「ローカルサーバー・ポートの状態」参照）。
- `theme.ts`の`background`/`backgroundElement`の意味が今回のセッションで反転した（上記参照）。今後この2トークンを使うときは「ページ背景=グレー、カード背景=白」という前提で考えること。
- 新設した`IconBadge`/`useIconBadgeColors`/`useResolvedColorScheme`は今後のUI追加でも再利用すること（車輪の再発明をしない）。
- Google Calendar OAuthは`expo-auth-session`のネイティブリダイレクト（`shiftcalendarai://`スキーム）に依存しており、Expo Go/Expo Webでは動作しない（前セッションからの既知事項、変更なし）。

### 今回のセッションで変更したファイル

**新規**: `src/components/calendar/month-list.tsx`, `src/components/icon-badge.tsx`, `src/hooks/use-icon-badge-colors.ts`, `src/hooks/use-resolved-color-scheme.ts`

**変更**: `src/app/(tabs)/calendar-view.tsx`, `src/app/(tabs)/payroll.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/template.tsx`, `src/app/_layout.tsx`, `src/app/analyzing.tsx`, `src/app/calendar-confirm.tsx`, `src/app/complete.tsx`, `src/app/photo-select.tsx`, `src/app/shift-review.tsx`, `src/app/user-match-select.tsx`, `src/components/ad-placeholder.tsx`, `src/components/calendar/month-grid.tsx`, `src/components/circular-progress.tsx`, `src/components/themed-text.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`, `src/models/user.ts`, `src/store/useAppStore.ts`, `src/utils/computePayroll.ts`

**参考**: 実装計画の詳細は`.claude/plans/stitch-wondrous-globe.md`に残っている（Stitchモックアップ由来の正確な色・余白・タイポグラフィの値の根拠として引き続き参照可能）。
