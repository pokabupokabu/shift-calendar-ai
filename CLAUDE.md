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

## 引き継ぎメモ（2026-09-23時点、次セッション向け）

### このプロジェクトの現状

- ローカル開発環境（clone・`npm install`・`.env`）はセットアップ済みで、Expo Web（`npx expo start --web`、ポート8081）で動作確認しながら進めている。
- Gemini APIキー・Google Calendar OAuth（iOS用クライアントID）は取得済みで`.env`に設定済み（詳細は下記「環境変数の状態」）。実際にAI解析からカレンダー登録確認画面まで、実データで動作確認できている。
- **重要: このセッションの変更は一切コミットされていない。** `git log`は`3eca4e8`（Phase 5: GoogleCalendarProviderのOAuth実装）が最新で、それ以降の全作業はワーキングツリー上の未コミット差分としてのみ存在する。`git status --short`で全体像を確認してから作業を始めること。
- 実装計画ファイル`.claude/plans/proud-painting-ritchie.md`には「5タブ構成への画面リニューアル」の計画（フェーズ1）が残っているが、これは今回の引き継ぎ対象の**一部**でしかない。フェーズ1完了後、ユーザーからさらに大きな追加要望（下記フェーズ2）が来て、それはプランモードを使わず直接実装した。プランファイルの内容だけを見て「これが最新の全体像」と誤解しないこと。

### 何が進行中か

**フェーズ1（完了・コミット待ち）**: 単線フロー（起動画面→写真選択→…→完了）から、下部タブナビゲーション構成への刷新。

**フェーズ2（完了・コミット待ち）**: フェーズ1の後、ユーザーから来た追加の画面修正要望一式。具体的には:
- タブ構成の再調整（ホーム廃止、「テンプレ」タブ追加、並び順を カレンダー／テンプレ／スキャン／給与／設定 に変更、スキャンボタンをタブバーから浮き出す形にさらに強調、ラベル見切れ修正）
- シフトスキャン中の円形プログレスリング＋%表示
- 「あなたのシフトはこちらです」画面（`shift-results.tsx`）を廃止し、`calendar-confirm.tsx`に統合（写真プレビュー＋編集可能カード＋チェックボックス廃止→「消す」「元に戻す」方式）
- カレンダービューの日別バッジ表示・土日祝の赤字・ページタイトル追加
- 設定タブ／テンプレタブのデザイン改善（**ここはまだ未着手・ユーザー未決定**、下記参照）

**フェーズ3（未着手・ユーザー返答待ち）**: 設定タブ「パクリ対策」＋追加候補、テンプレタブUI改善候補（A/B/Cの3案）について、ユーザーから「サンプル画像を見たい」と言われ、比較用モックアップHTML（`design_candidates.html`）を作成した直後にセッションが中断した。**このモックアップはまだユーザーに提示できていない**（Artifact化もSendUserFileも未実施）。ファイルは`/private/tmp/claude-501/-Users-a81901-shift-calendar-app/a8c3dec3-dfb1-452c-b3c3-169e31189138/scratchpad/design_candidates.html`にあるが、このパスはセッション専用の一時ディレクトリなので**次セッションでは既に消えている可能性が高い**。ユーザーがモックアップの続きを求めたら、再生成が必要になる可能性が高いことを前提に対応する。

### サブタスクごとの進捗状況

| 項目 | コード | ローカル動作確認 | コミット |
|---|---|---|---|
| ローカル環境セットアップ・Gemini APIキー取得 | - | ✅ 実解析成功済み | - |
| Google Calendar OAuth（iOS）設定 | ✅ | ⚠️ OAuthクライアント発行のみ、実際のサインインフローは未検証（Expo Web/Goでは動かない仕様、実機ビルドが必要） | 未 |
| `removeChild`クラッシュの調査・`deferNavigation`導入 | ✅ | ✅（ただし原因は自動テスト手法のダミーダイアログ起因と判明、実ユーザー操作では非発生と確認済み。下記Gotchas参照） | 未 |
| 5タブナビゲーション基盤（トークン・データモデル・ルーティング） | ✅ | ✅ | 未 |
| ホームタブ廃止・テンプレタブ追加・並び順変更・スキャン強調 | ✅ | ✅ | 未 |
| 円形プログレスリング（`circular-progress.tsx`） | ✅ | ✅（実データでの解析中画面表示を確認） | 未 |
| `calendar-confirm.tsx`再設計（写真プレビュー・消す/元に戻す・日付追加） | ✅ | ⚠️ 写真表示・消す・件数連動は実データで確認済み。**「元に戻す」ボタンのクリックが未確認のままセッション中断**（クリックした直後に割り込みが発生、結果は見ていない）。「日付を追加」ボタン・カードタップでの`shift-review`編集遷移も未確認 | 未 |
| カレンダービュー（バッジ・土日祝赤字・タイトル） | ✅ | ✅（`@holiday-jp/holiday_jp`導入、2026/9/21・22・23の祝日を正しく赤字表示することをDOM computed styleで確認済み） | 未 |
| 給与計算タブの日別履歴 | ✅ | ✅ | 未 |
| 設定タブ（一般的なアプリ設定UI）・テンプレタブ（旧設定内容移設） | ✅ | ✅ | 未 |
| 設定タブ差別化・テンプレUI改善 | 未着手 | - | - |
| 初回チュートリアル | ✅ | ✅（マイグレーションで既存ユーザーはスキップされることも確認済み） | 未 |

### 環境変数の状態

`.env`は`.gitignore`済みで安全。中身（値は伏せる）:
- `EXPO_PUBLIC_AI_PROVIDER`: 設定済み（`gemini`）
- `EXPO_PUBLIC_GEMINI_API_KEY`: 設定済み（Google AI Studioの`shift-calendar-ai`プロジェクトで発行、無料枠・請求先アカウント未リンク＝上限超過の課金リスクなし）
- `EXPO_PUBLIC_GEMINI_MODEL`: 設定済み
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: 設定済み（同じ`shift-calendar-ai`プロジェクトのOAuthクライアント、iOS bundle identifier `com.pokabu.shiftcalendarai`は**仮**設定、アプリ完成後に正式なものへ見直す約束になっている）
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: 未設定（現状iOSクライアントのみ使用、Web版OAuthは未対応のまま）

### 次にやること（優先順）

1. `git status --short`でこのセッションの全変更を確認し、ユーザーに内容を説明した上でコミットするか相談する（このセッションでは一度もコミットしていない）
2. `public/_test_sample_shift.png`とその親ディレクトリ`public/`はテスト用に手動で作った一時ファイル（Expo Webの静的配信を使ってブラウザにテスト画像を注入するためのもの）。**アプリの一部ではないので、コミット前に削除する**（`rm -rf public/`）
3. `calendar-confirm.tsx`の未確認部分を実際に操作して検証する: 「元に戻す」ボタン、「日付を追加」ボタン、カードタップでの`shift-review`編集遷移
4. 設定タブの差別化案・テンプレタブの改善案について、ユーザーの回答を待つ（`design_candidates.html`のモックアップを見せる約束をしていたが未提示。消えていたら`Skill: artifact-design`を読み直してから同等のものを作り直す）
5. README.md「8. 不明点・リスク」に残っている項目（Gemini APIキーの扱い方針の最終確定、Google OAuthの実機検証など）の状況をREADMEに反映するか確認する

### Gotchas（このセッションで時間を使って分かったこと）

- **`removeChild`の`NotFoundError`は偽陽性**: ブラウザの自動テストで`<input type=file>`を`.click()`してから、実際のOS/ブラウザのネイティブファイル選択ダイアログを操作せずJSで直接`.files`を注入する手法（このセッションで多用した動作確認用のハック）を使うと、宙に浮いたままのネイティブダイアログが後から作用して発生する。**実際のユーザー操作（本物のダイアログ経由）では一切発生しないことを複数回確認済み**。今後同じエラーが自動テスト中に出ても、慌てて調査し直さなくてよい。
- **祝日の赤字表示はスクリーンショットの見た目だけでは判別しづらい**: 実装は正しく動いているが、9/21・22のような祝日の赤字が小さいフォントだとスクリーンショット上で黒に見えることがある。疑わしいときは`getComputedStyle`でDOM上の実際の色を確認すること（今回はこれで「バグではない」と確定できた）。
- **新しいnpm依存を追加したら`npx expo start --web --clear`でMetroを再起動すること**。追加直後は既存プロセスが認識せず、原因不明のエラーに見えることがある（`lucide-react-native`導入時に一度これで詰まった）。
- **サブエージェント（`subagent_type: claude`）はまれに応答が止まる（600秒無応答でタイムアウト）ことがある**。今回1回発生し、該当タスクは手動で仕上げた。並列実行時は最終的な`git status`とファイル内容の目視確認を必ず行い、「完了」報告を鵜呑みにしない。
- **サブエージェントの報告文に他言語（ドイツ語）や口調指定（クロちゃん語「しん」）が混入することがあるが、実際のアプリコード自体は毎回`grep`で確認してクリーンだった**。報告文の言語は無視してよいが、コード自体は都度`grep -rn "しん" src/`等でチェックする習慣を続けること。
- Google Calendar OAuthは`expo-auth-session`のネイティブリダイレクト（`shiftcalendarai://`スキーム）に依存しており、**Expo Go/Expo Webでは動作しない**。実際のサインインテストには実機/シミュレータ向けdevelopment buildが必要（未実施）。

### このセッションで変更したファイル

**新規**:
`src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/calendar-view.tsx`, `src/app/(tabs)/payroll.tsx`, `src/app/(tabs)/scan.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/template.tsx`, `src/app/tutorial.tsx`, `src/components/ad-placeholder.tsx`, `src/components/card.tsx`, `src/components/circular-progress.tsx`, `src/components/calendar/month-grid.tsx`, `src/components/tutorial/tutorial-slide.tsx`, `src/hooks/use-month-navigation.ts`, `src/utils/computePayroll.ts`, `src/utils/deferNavigation.ts`

**変更**: `CLAUDE.md`, `app.json`（iOS bundle identifier追加）, `package.json`/`package-lock.json`（`lucide-react-native`, `react-native-svg`, `@holiday-jp/holiday_jp`追加）, `src/app/_layout.tsx`, `src/app/analyzing.tsx`, `src/app/calendar-confirm.tsx`, `src/app/complete.tsx`, `src/app/index.tsx`, `src/app/settings/shift-types.tsx`, `src/app/user-match-select.tsx`, `src/components/themed-text.tsx`, `src/constants/theme.ts`, `src/models/calendarEvent.ts`, `src/models/shiftType.ts`, `src/store/useAppStore.ts`, `src/store/useShiftSessionStore.ts`

**削除**: `src/app/settings/index.tsx`（`(tabs)/template.tsx`へ統合）, `src/app/shift-results.tsx`（`calendar-confirm.tsx`へ統合）

**要クリーンアップ（コミット対象外）**: `public/`（テスト用画像、削除すること）
