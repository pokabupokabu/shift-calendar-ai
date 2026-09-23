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

## 引き継ぎメモ（2026-09-23 22時台時点、次セッション向け）

### このプロジェクトの現状

- 最新コミットは`f18c3d1`（5タブ構成への画面リニューアル、前セッションの成果）。**今回のセッションの変更は一切コミットされていない。** `git status --short`で全体像を確認してから着手すること。
- ローカル動作確認はExpo Web（`npx expo start --web`）で行っている。**重要: 開発サーバーのポートまわりに要注意事項あり、下記「ローカルサーバー・ポートの状態」を必ず読むこと。**
- 今回のセッションは、前回作った5タブ構成に対するユーザーからの詳細なUIフィードバック（カレンダー・テンプレ・スキャンタブ）を、複数ラウンドに渡って修正した回。プランモードは使わず、都度`AskUserQuestion`で方針を確認しながら直接実装した。

### ローカルサーバー・ポートの状態（次セッションが必ず踏む可能性がある地雷）

- ポート**8081**で、前セッションから動きっぱなしの古いExpoプロセス（PID 75565、`npx expo start --web --clear`）が生きている。**ここに実際のテストデータ（ユーザー登録・シフト・カレンダー登録済みイベントなど）が入っている。**
- Expo Webの`AsyncStorage`は`localStorage`ベースで、**ポート番号込みのoriginごとに別データ**。今セッション中、`.claude/launch.json`の`expo-web`設定が「8081が使用中なら別の空きポートを自動選択する」仕様（`autoPort: true`）になっていたせいで、`preview_start`を呼ぶたびに新しい空っぽのポート（51550→52165、と2回発生）に飛んでしまい、「データが消えた」ように見える事故が2回起きた。
- **この対策として、`.claude/launch.json`の`expo-web`設定を`"autoPort": false`に変更済み。** これにより、次に`preview_start({name: "expo-web"})`を呼んだ時、8081が埋まっていれば黙って新ポートに逃げず、エラーで止まるようになっているはず。
- **次セッションでの正しい動き方**: `preview_start`は使わず、ブラウザの`navigate`で直接`http://localhost:8081`を開くこと。もし`preview_start`を使ってエラーになったら、それは仕様通り（8081が使用中という合図）なので、新ポートに逃げるのではなく8081を直接開き直す。
- PID 75565自体は今回`kill`していない（`kill`コマンドはClaude Codeの自動許可の壁でブロックされる操作で、ユーザーに毎回確認が必要。前回・今回とも「今は残したままでいい」という結論だった）。ユーザーから明示的に許可が出れば、ターミナルで`kill 75565`してから`preview_start`で正式に8081を再取得する、という手もある。

### 今回のセッションで実装した内容

**カレンダータブ**:

- 日付セル内のシフト種別バッジを、日付の右に配置したまま、はみ出さずに省略表示されるよう修正（一度「1行にまとめる」方式に変えて怒られたので、位置は変えずに直す方針に戻した経緯あり）。
- 前後月の日付も薄く表示し、常に7×5マスの完全な格子になるよう`month-grid.tsx`の`useGridDays`を追加。
- 日別の時間帯表示を「09:00」「18:00」の2行表示に変更（コンパクトな「9-18」表記をやめた）。
- 日付タップ時の表示を、画面下部への埋め込みから中央ダイアログ（`src/components/dialog.tsx`）表示に変更。
- 「カレンダーを見に行く」ボタンを、広告枠のすぐ上（スクロール末尾側）に移動。

**テンプレタブ**（このセッションで最も方針転換が多かった箇所）:

- 「表示名」→「登録者キーワード」に改称、値表示＋鉛筆アイコン＋「編集」ラベルの行形式に変更、編集はダイアログで行う。
- 「登録先カレンダー」→「連携済みカレンダー」に改称。二者択一の横並びピルをやめ、現在の連携先を「連携済み✓」付きのリスト行として表示し、「その他」をタップすると`/settings/calendar-providers`（対応カレンダー一覧）→`/settings/calendar-connect?provider=...`（連携専用ページ、「連携する」ボタン）という画面遷移を実装。**ただし実際の`CalendarProvider.authenticate()`/権限リクエストの呼び出しはまだ繋いでいない、画面遷移とUIのみのモック実装**（ユーザーに確認済みの選択）。
- シフト種別をテンプレタブ画面に直接インライン表示（名前＋時間帯のリスト、鉛筆＋「編集」でダイアログ編集）。追加は下書き状態にしてから「戻る／追加」を選べる方式（戻ると何も保存されない）。これに伴い旧`src/app/settings/shift-types.tsx`は完全に不要になったため削除した。
- 給与形態（時給/日給）をシフト種別ごとの設定から**アプリ全体共通の設定**に変更。`UserSettings`に`wageType`/`hourlyWage`（デフォルト1300円）/`dailyWage`（デフォルト10400円）を追加し、テンプレタブの「給与形態」ブロックで両方の金額を常に編集可能にした。`ShiftType`からは`wage`関連フィールドを完全に削除（`id`/`name`/`startTime`/`endTime`のみに戻した）。

**スキャン関連（`calendar-confirm.tsx` / `shift-review.tsx`）**:

- 「日付を追加」ボタンを、テンプレート（早番/遅番/夜勤ボタン、押すと時間が自動入力）＋自由入力（日付・時刻を直接テキストで書き込める）のダイアログに変更。`useShiftSessionStore`の`addManualShift`を`addShift(input)`に置き換えた。
- **原因究明**: 当初`@expo/ui`のネイティブ`DateTimePicker`を使っていたが、Expo Web上では値が表示されず操作も一切効かない（ユーザーには「固まった」と見えていた）ことが判明。`calendar-confirm.tsx`の追加ダイアログと`shift-review.tsx`の両方から`DateTimePicker`を撤去し、素の`TextInput`（"YYYY-MM-DD"/"HH:mm"）に置き換えた。実機での見た目は自由入力のテキストボックスになる。
- `shift-review.tsx`の「日をまたぐ（夜勤など）」手動トグルを削除し、`endTime <= startTime`から自動判定するように変更（他の画面と同じロジックに統一）。

**データマイグレーション**: `useAppStore.ts`の永続化バージョンを3に更新。v2→v3で、シフト種別ごとの古い賃金関連フィールドを破棄し、`UserSettings`に新しいデフォルト値（時給1300円・日給10400円など）を補完するマイグレーションを追加済み。ブラウザで実際に既存テストデータが壊れず引き継がれることを確認済み。

**設定タブ・テンプレタブのデザイン比較Artifact**: 「設定・テンプレ改善案」というArtifactを作成し、v1〜v4まで反復してユーザーに提示・共有済み（対応完了、次セッションへの持ち越し作業ではない）。

### 環境変数の状態

`.env`は`.gitignore`済みで安全。中身（値は伏せる、前回から変更なし）:

- `EXPO_PUBLIC_AI_PROVIDER`: 設定済み（`gemini`）
- `EXPO_PUBLIC_GEMINI_API_KEY`: 設定済み（Google AI Studioの`shift-calendar-ai`プロジェクトで発行、無料枠・請求先アカウント未リンク＝上限超過の課金リスクなし）
- `EXPO_PUBLIC_GEMINI_MODEL`: 設定済み
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: 設定済み（同じ`shift-calendar-ai`プロジェクトのOAuthクライアント、iOS bundle identifier `com.pokabu.shiftcalendarai`は**仮**設定、アプリ完成後に正式なものへ見直す約束になっている）
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: 未設定（現状iOSクライアントのみ使用、Web版OAuthは未対応のまま）

### 次にやること（優先順）

1. `git status --short`で今回のセッションの全変更を確認し、ユーザーに内容を説明した上でコミットするか相談する（一度もコミットしていない。なお`assets/expo.icon/icon.json`と`docs/requirements.md`の差分は`npm run format`によるプリティア整形だけで、内容的な変更ではない点に注意）。
2. カレンダー連携（`/settings/calendar-providers`・`/settings/calendar-connect`）の実認証を本実装するかどうか、ユーザーに確認する。今は画面遷移のみのモックで、`authenticate()`/`requestCalendarPermission()`は繋がっていない。
3. README.md「8. 不明点・リスク」に残っている項目（Gemini APIキーの扱い方針の最終確定、Google OAuthの実機検証など）の状況を反映するか確認する。
4. `shift-review.tsx`・`calendar-confirm.tsx`の日付/時刻を自由入力のテキストボックスに変更した実機での見た目は未確認（iPhone専用アプリなので、実機/シミュレータでの確認が必要）。

### Gotchas（このセッションで時間を使って分かったこと）

- **ポート/`AsyncStorage`origin問題は再発しやすい**: 上記「ローカルサーバー・ポートの状態」を参照。`autoPort: false`に変えたことで今後は「エラーで止まる」形になるはずだが、もし別の理由でまた新ポートに飛んでしまったら、まず`lsof -i :8081`で誰が使っているか確認し、新ポートに逃げず8081を直接見に行くこと。
- **`@expo/ui`のネイティブ`DateTimePicker`はExpo Webで機能しない**（値が見えない・操作もできない）。今回この2画面から完全に撤去したが、もし他の画面で同じコンポーネントを見つけたら同様に注意。
- **Browser paneの`computer`ツールのクリックが、一部の画面（ダイアログ内など）で毎回30秒タイムアウトしてボタン押下が効かないことがある**（アプリ側のエラーは出ない）。回避策: `javascript_tool`でPressableの実DOM要素に対し`pointerdown→mousedown→pointerup→mouseup→click`のPointerEventを`dispatchEvent`する疑似クリックを使うと確実に動作する。ただし**2つの操作を同じスクリプト内で連続dispatchすると、Reactの状態更新が間に合わず2つ目が古い値を見てしまう**ことがあった（テンプレート選択→追加、を1回のjavascript_execで続けて実行したら反映されなかった）。関連する操作は別々の`javascript_exec`呼び出しに分けること。
- **祝日の赤字表示はスクリーンショットの見た目だけでは判別しづらい**。疑わしいときは`getComputedStyle`でDOM上の実際の色を確認する。
- Google Calendar OAuthは`expo-auth-session`のネイティブリダイレクト（`shiftcalendarai://`スキーム）に依存しており、**Expo Go/Expo Webでは動作しない**。実機/シミュレータ向けdevelopment buildでの検証は未実施。

### 今回のセッションで変更したファイル

**新規**: `src/app/settings/calendar-connect.tsx`, `src/app/settings/calendar-providers.tsx`, `src/components/dialog.tsx`

**変更**: `.claude/launch.json`（`autoPort: false`）, `CLAUDE.md`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/calendar-view.tsx`, `src/app/(tabs)/payroll.tsx`, `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/template.tsx`, `src/app/_layout.tsx`, `src/app/calendar-confirm.tsx`, `src/app/shift-review.tsx`, `src/components/calendar/month-grid.tsx`, `src/models/shiftType.ts`, `src/models/user.ts`, `src/store/useAppStore.ts`, `src/store/useShiftSessionStore.ts`, `src/utils/computePayroll.ts`（`assets/expo.icon/icon.json`・`docs/requirements.md`もdiffに出るが`npm run format`のプリティア整形のみ）

**削除**: `src/app/settings/shift-types.tsx`（`(tabs)/template.tsx`のインラインシフト種別リストへ統合）
