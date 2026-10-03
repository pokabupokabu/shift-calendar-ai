# シフト転記AIアプリ（shift-calendar-ai）

シフト表の写真をAIが読み取り、自分のシフトだけを抽出してiPhone/Googleカレンダーへ登録するアプリ。
要件定義書: `docs/requirements.md` を参照（本リポジトリの `side-business-tracker` とは別プロダクト）。

## セットアップ

```bash
cd apps/shift-calendar-ai
npm install
cp .env.example .env   # 値を埋める。EXPO_PUBLIC_* はJSバンドルに埋め込まれる点に注意（後述）
npx expo start
```

- `npm run lint` / `npm run typecheck` / `npm run format`
- iPhone専用（Androidは対象外）。実機確認は Expo Go またはdevelopment buildで行う。

## 1. プロジェクト構成

このリポジトリ（`side-business-tracker`）内に、既存のNext.js資産とは独立したExpoプロジェクトとして
`apps/shift-calendar-ai/` を追加した。ワークスペース化はせず、`package.json`・`node_modules`とも
完全に独立している（2つのアプリは技術スタック・依存関係を何も共有しないため）。

```
apps/shift-calendar-ai/
  src/
    app/                 # expo-router のファイルベースルーティング（画面一覧は5節）
      settings/
    components/          # 汎用UIパーツ（Screen, PrimaryButton, ThemedText/View）
    config/env.ts         # process.env.EXPO_PUBLIC_* の単一窓口
    constants/theme.ts     # 配色・余白・フォント
    hooks/
    models/               # データモデル（2節）
    services/
      ai/                 # AIProvider インターフェース + Gemini実装（3節）
      calendar/           # CalendarProvider インターフェース + Apple/Google実装（4節）
    store/
      useAppStore.ts        # 永続化される状態（ユーザー・シフト種別マスター・作成済みイベント記録）
      useShiftSessionStore.ts # 1回の「撮影→解析→確認→登録」フローだけの一時状態（非永続）
    utils/
```

Expoアプリとは別に、リポジトリ直下に`server/gemini-proxy/`（Cloudflare Workers、Gemini APIキーを
クライアントから隠す薄いプロキシ。8節リスク1参照）がある。

## 2. 使用技術・依存関係

| 領域                   | 選定                                                                 | 理由                                                                                 |
| ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| フレームワーク         | Expo SDK 57 / React Native 0.86 / expo-router                        | iPhone専用MVPでもEASでのビルド・配信が楽。file-based routingで画面遷移の見通しが良い |
| 言語                   | TypeScript（strict）                                                 | AI出力JSON・カレンダーAPIの型を静的に保証する                                        |
| 状態管理               | zustand                                                              | Reduxほどの定型文が不要。永続化用途と一時セッション用途でストアを分離できる          |
| ローカル永続化         | `@react-native-async-storage/async-storage`（zustand `persist`経由） | ログイン不要のMVP方針（19節）に合わせ、サーバーではなく端末に保存                    |
| 画像取得               | `expo-image-picker`                                                  | カメラ撮影・ライブラリ選択・複数選択のいずれもサポート（5節）                        |
| Apple Calendar         | `expo-calendar`（EventKitラッパー）                                  | ネイティブ実装を書かずにEventKitへアクセスできる                                     |
| Google Calendar (認証) | `expo-auth-session` + `expo-crypto`                                  | OAuth PKCEフローを自前実装せずに済む                                                 |
| 日付処理               | `date-fns`（`date-fns/locale/ja`）                                   | 「9/20（日）」のような和文表示フォーマットが必要（9節）                              |
| Lint/Format            | `eslint-config-expo` + `prettier`                                    | テンプレート標準。`npm run lint`で担保                                               |

Gemini/Google Calendar本体の呼び出しライブラリは未追加（後述のPhase 1/5で実装時に追加する）。

## 3. データモデル（要件定義書20節に対応）

`src/models/` に型として定義済み。

- `User`（`shiftName` / `displayName` / `settings`）
- `Shift`（`date` / `startTime` / `endTime` / `shiftType` / `isOvernight` / `confidence` / `source`）
  - `confidence`は内部保持のみ。`needsReview()`で閾値判定し、UIには数値を出さない（9節）
- `ShiftType`（シフト種別名と時間の対応マスター、8節の「学習」の保存先）
- `CalendarEventRecord`（アプリが作成したイベントとShiftの紐付け。上書き判定の基盤、12/14節）
- `ShiftAnalysisResult`（AIの生JSON契約。`shifts[]` / `userMatch` / `warnings` / `sourceImage`、6節）

## 4. AI解析インターフェース（Adapter化、6・24節）

`src/services/ai/types.ts` の `AIProvider`：

```ts
interface AIProvider {
  readonly id: string;
  analyzeShiftImages(input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult>;
}
```

`getAiProvider()`（`src/services/ai/index.ts`）が`EXPO_PUBLIC_AI_PROVIDER`を見て実装を返す。
モデル差し替え（Proプラン候補、5節）は新しい`AIProvider`実装を追加するだけで済む。
`GeminiProvider`はPhase 1で実装済み（Gemini 3系への直接呼び出し、`responseSchema`で`ShiftAnalysisResult`同型のJSONを強制）。
`userMatch`が`ambiguous`/`not_found`のときの候補選択は`AnalyzeShiftImagesInput.confirmedRowLabel`経由で
再解析する形でPhase 2実装済み（`src/app/user-match-select.tsx`）。

## 5. CalendarProviderインターフェース（13〜15・20節）

`src/services/calendar/types.ts` の `CalendarProvider`。AppleとGoogleは意図的に別実装にし、
共通インターフェースがどちらかのSDKの形を漏らさないようにしている。

- `AppleCalendarProvider`：`expo-calendar`を使って実装済み（権限取得・作成・更新・削除・カレンダーを開く）
- `GoogleCalendarProvider`：Phase 5で実装済み。`expo-auth-session`のPKCE（`AuthRequest`/`exchangeCodeAsync`/`refreshAsync`を直接利用。
  `expo-auth-session/providers/google`のフック版はこのExpoバージョンでは非推奨のため使用していない）でOAuthし、
  Google Calendar API v3へ`fetch`で作成・更新・削除。トークンは`AsyncStorage`にこのProvider内だけで保持する。
  実際に動かすには**リスク2のOAuthクライアントID発行がまだ必要**（下記「不明点・リスク」参照）。

## 6. 画面一覧（MVP、要件定義書 Claude Codeプロンプトの「MVP画面」節）

`src/app/` にexpo-routerのファイルとして配置済み。AI解析（Gemini、Phase 1/2）とApple Calendar登録は
実処理まで接続済み。Google Calendarは未接続（下記「未実装」参照）。

| #   | 画面                         | ファイル                       |
| --- | ---------------------------- | ------------------------------ |
| 1   | 初回画面                     | `app/index.tsx`                |
| 2   | 名前入力画面                 | `app/name-input.tsx`           |
| 3   | 写真選択画面                 | `app/photo-select.tsx`         |
| 4   | AI解析中画面                 | `app/analyzing.tsx`            |
| 4.5 | 本人確認（候補選択）画面※    | `app/user-match-select.tsx`    |
| 5   | シフト結果一覧               | `app/shift-results.tsx`        |
| 6   | 要確認・編集画面             | `app/shift-review.tsx`         |
| 7   | カレンダー登録確認画面       | `app/calendar-confirm.tsx`     |
| 8   | 登録完了画面                 | `app/complete.tsx`             |
| 9   | 設定画面                     | `app/settings/index.tsx`       |
| 10  | シフト種別・時間マスター画面 | `app/settings/shift-types.tsx` |

※ MVP画面一覧（要件定義書）にはない、Phase 2で追加した画面。`userMatch.status`が
`ambiguous`/`not_found`のときだけ`analyzing`からここへ遷移し、`matched`ならそのまま5へ進む。

## 7. MVPの最小実装順序（開発フェーズ、25節に対応）

現状（このセットアップで完了している範囲）と、次にやるべきことを分けて示す。

- [x] Phase 0（今回）: プロジェクト構成・依存関係・データモデル・AIProvider/CalendarProviderインターフェース・
      画面の骨組みと画面遷移・ローカル永続化・env設定
- [x] Phase 1: `GeminiProvider.analyzeShiftImages`の実装（画像→AI→Shift JSON のPoC、Gemini 3系・直接呼び出し）
- [x] Phase 2: 本人シフト抽出のプロンプト調整（`userMatch`が`ambiguous`/`not_found`のときの候補選択UI、`user-match-select`画面）
- [x] Phase 3: 確認UIの磨き込み（`shift-review`の日付・時刻をネイティブピッカー化。リスク5参照）
- [ ] Phase 4: Apple Calendar連携の実機検証（コードは実装済み、実機での権限フロー・EventKit挙動を確認）
- [x] Phase 5: `GoogleCalendarProvider`の実装（OAuth・Calendar API呼び出し。実際に使うにはリスク2のクライアントID発行が別途必要）
- [ ] Phase 6: 上書き判定の実機検証
- [x] Phase 7: シフト種別マスターの「学習」を`AnalyzeShiftImagesInput.knownShiftTypes`経由でAIプロンプトへ反映
      （`geminiProvider.ts`の`buildPrompt`で既に組み込み済み。チェック漏れだっただけ）
- [x] Phase 8: エラー処理の拡充。カレンダー連携の権限/認証エラー（`ensureCalendarAccess.ts`）・AI解析失敗・
      カレンダー登録失敗（`calendar-confirm.tsx`）・写真選択画面でのカメラ/フォトライブラリ権限拒否時
      （`photo-select.tsx`）まで、いずれもAlert表示を実装済み
- [x] Phase 9: 広告（`react-native-google-mobile-ads`導入、`AdPlaceholder`をPro時は非表示・無料時は実バナーに変更。
      iOS App ID・広告ユニットIDはGoogle公式のテスト値のままなので、本番配信前に実際のAdMob値へ差し替えが必要）。
      あわせてリワード広告（`rewardedAd.native.ts`）も実装: 無料プランが月4回の上限に達した際、広告視聴で
      ボーナススキャンを1回獲得できる（月`MAX_BONUS_SCANS_PER_MONTH`=5回まで、`scanQuota.ts`）
- [x] Phase 10: Pro機能（基盤・複数勤務先・給与計算等は実装済み。決済はRevenueCat
      (`react-native-purchases`)を導入し、`paywall.tsx`から実際の購入・復元フローを呼べる。ただし
      RevenueCat側のAPIキー・「pro」エンタイトルメント・App Store Connect側のサブスク商品は
      いずれも未設定なので、現状は何も起きない。開発用の合言葉(DEVPRO/DEVFREE、設定画面)は
      Pro表示のテスト用に引き続き有効）

## 8. 不明点・リスク

1. ~~**AI APIキーをクライアントに埋め込む設計のリスク**：要件定義書は「画像をクラウドAIへ直接送信」とだけ規定しており、
   バックエンドを挟むかどうかは未確定。`EXPO_PUBLIC_*`環境変数はJSバンドルに平文で埋め込まれるため、
   このままGemini API keyを`EXPO_PUBLIC_GEMINI_API_KEY`に入れて配信すると、アプリを解凍した第三者が
   キーを読み取れる（無制限に使われる／課金される恐れ）。~~
   → 解消済み。(a) 薄いプロキシを挟む方針に決定し、`server/gemini-proxy/`にCloudflare Workers製の
   透過プロキシを実装した。実際のGemini APIキーはそのWorkerのシークレットとしてのみ保持され、
   クライアントはWorkerのURL(`EXPO_PUBLIC_AI_PROXY_URL`)と、乱用防止用の共有シークレット
   (`EXPO_PUBLIC_AI_PROXY_SECRET`、IPベースの簡易レート制限と組み合わせ)だけを持つ。
   デプロイ手順は`server/gemini-proxy/README.md`参照（Cloudflareアカウントでの`wrangler login`等、
   ユーザー自身の操作が必要）。
2. ~~**Google Calendar OAuthのクライアントID**：コード側（`GoogleCalendarProvider`、Phase 5）は実装済みだが、
   `expo-auth-session`でのiOS向けOAuthクライアントIDが未発行のため、実際には動かせない。~~
   → クライアントID自体は発行済み（Google Cloud Console、プロジェクト`shift-calendar-ai`、
   `shift-calendar-ai-ios`、`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`に設定済み）。ただし公開ステータスが
   「テスト中」のままなので、Google Cloud Console上で登録した**テストユーザー以外はサインインできない**
   （本番公開するとGoogleの審査が必要になる可能性あり、所要日数が読みにくいため、実機検証（Phase 4/6）が
   終わってから着手する方針）。またExpo Goでは動作しないため、development buildが必要（EAS Build、ロードマップ
   フェーズB）。
3. **上書き判定はアプリ内記録のみに依存**：`CalendarEventRecord`はローカル永続化のみなので、
   アプリを削除・再インストールすると「アプリが以前作成したイベント」の記録が失われ、
   重複登録される可能性がある。要件定義書12節の想定どおりだが、ユーザーには伝わりにくいため、
   設定画面などで一言説明を入れるかは要検討。
4. ~~**シフト表画像のサイズ**：スクリーンショット・高解像度写真をそのままBase64で送る前提だが、
   Gemini側のリクエストサイズ上限・料金への影響を見て、送信前のリサイズ要否をPhase 1で判断する。~~
   → 解消済み。`resizeShiftImage.ts`で、長辺が2000pxを超える画像のみ`expo-image-manipulator`で
   縮小・再エンコードしてから送信する。
5. ~~**`shift-review`画面の入力方式**：MVPでは日付・時刻を自由入力のテキストフィールドにしている
   （ネイティブの日付・時刻ピッカーは未導入）。誤入力のリスクがあるため、Phase 3で
   `@react-native-community/datetimepicker`等の導入を検討する。~~
   → Phase 3で解消済み。追加の依存関係なしで、既存の`@expo/ui`（`@expo/ui/community/datetime-picker`、
   内部はSwiftUIの`DatePicker`）でネイティブピッカー化した。
6. **RevenueCat側の設定が未完了**：クライアントの決済コード（`purchases.native.ts`、Phase 10）は実装済み
   だが、RevenueCatアカウント・APIキー（`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`）・「pro」エンタイトルメント・
   App Store Connect側のサブスク商品のいずれも未作成。App Store Connect側の設定はApple Developer
   Program登録（ロードマップフェーズB）が前提になるため、それより前には完了できない。
7. **AdMob側の設定が未完了**：`AdPlaceholder`（Phase 9）はGoogle公式のテスト用App ID・広告ユニットIDの
   ままなので、このままでは収益が発生しない（開発中は正常）。本番配信前に実際のAdMobアカウントを作成し、
   `app.json`の`iosAppId`と`ad-placeholder.native.tsx`の`TestIds`を実際の値に差し替える必要がある。

## 9. 環境変数

`.env.example`参照。`EXPO_PUBLIC_`接頭辞の変数はビルド時にJSバンドルへ埋め込まれるため、
書き込み権限や従量課金が発生する実際の秘密情報（Gemini APIキー本体など）はコミットはもちろん、
本番配信ビルドにも絶対に入れない（`EXPO_PUBLIC_AI_PROXY_SECRET`はWorker側の合言葉と同じ扱いの
準秘密情報であり、Gemini APIキー本体ではないが、それでも実運用の値を気軽にコミットしないこと）。
