# デザインシステム（UIの共通ルール）

UI全体の見直しで、すべての画面が守る共通ルール。Google Stitchに画面の改善を頼むときも、このファイルの「Stitchへ毎回添える指示」を必ず付ける。

- 作成: 2026-10-15
- 状態: 主要な決定は済み（2026-10-15）。グループごとの見直しで随時更新する

## 0. このルールの出どころ

| 出典                                                 | 内容                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Stitchへの最初のプロンプト（2026-09-22）             | 使う人・見た目の方向性・部品の考え方                                   |
| Stitchが出力したHTMLを読み取った計画書（2026-09-26） | 色・文字・角丸の実際の値、アイコンの読み替え表、Stitch案から外したもの |
| `src/constants/theme.ts`                             | 上の値をコードに写したもの（**このファイルの値が正**）                 |
| コードの棚卸し（2026-10-15）                         | 共通ルールから外れている箇所（「8. 今のコードとのずれ」）              |

当時Stitchが出したHTMLそのものは保存されていない。Stitchの元プロジェクトが見つかれば、部品一覧のページと照らし合わせて更新する。

## 1. 方向性

- **使う人**: 学生のバイト（接客・小売・カフェ・塾・コンビニ）。授業の合間や電車の中で、**片手でサッと見る**
- **優先すること**: 見た目の豪華さより **速さ・迷わなさ**。読ませるより、ひと目で分かる
- **雰囲気**: iPhone標準のアプリに近い、主張しすぎない道具。親しみやすいが子どもっぽくない。**本物のカレンダーに予定を書き込むアプリなので、信頼できる感じ**を崩さない
- **キャラクター**: はこブー（`docs/character/hakobu.md`）は、解析中・完了・要確認・チュートリアルなど**気持ちが動く場面だけ**に出す。設定や一覧などの事務的な画面には出さない

## 2. 色

**色は必ず `useTheme()` のトークンか `IconBadge` のトーンを使う。画面に16進数を直接書かない**（ダークモードで崩れるため）。

| トークン             | ライト    | ダーク    | 使う場面                           |
| -------------------- | --------- | --------- | ---------------------------------- |
| `background`         | `#F2F2F7` | `#000000` | 画面の地                           |
| `backgroundElement`  | `#FFFFFF` | `#1C1C1E` | カード・行・シートの地             |
| `backgroundSelected` | `#E5E5EA` | `#2C2C2E` | 押している最中・選択中             |
| `text`               | `#000000` | `#FFFFFF` | 本文・見出し                       |
| `textSecondary`      | `#8E8E93` | `#98989F` | 補足・ラベル・注釈                 |
| `primary`            | `#007AFF` | `#0A84FF` | 押せる文字・選択状態・アプリの主色 |
| `success`            | `#34C759` | `#30D158` | 完了・連携済み・オン               |
| `danger`             | `#FF3B30` | `#FF453A` | 削除・エラー・**要確認**           |
| `orange`             | `#FF9500` | `#FF9F0A` | 注意（警告ほど強くない）           |
| `purple`             | `#5E35B1` | `#9061F9` | 深夜・PRO                          |
| `border`             | `#E5E5EA` | `#38383A` | 区切り線・枠                       |
| `disabled`           | `#C7C7CC` | `#5C5C5E` | 押せない状態                       |

**アイコンの丸い背景（`IconBadge`）**: `blue` / `green` / `orange` / `purple` / `red` / `neutral` の6種類。淡い背景＋濃いアイコンの組み合わせで、行の先頭に置く。

**意味の決まった色**: 青＝操作できる、緑＝できた、赤＝消える・間違い・要確認、オレンジ＝注意、紫＝深夜・PRO。**飾りのために色を増やさない。**

## 3. 文字

iPhone標準の段階だけを使う（`ThemedText` の `type`）。

| `type`        | 大きさ/行間 | 太さ | 使う場面                           |
| ------------- | ----------- | ---- | ---------------------------------- |
| `title1`      | 28 / 34     | 700  | 画面の大見出し（1画面に1つまで）   |
| `title2`      | 22 / 28     | 700  | 画面の見出し・完了などのメッセージ |
| `title3`      | 20 / 25     | 600  | 金額などの強調                     |
| `headline`    | 17 / 22     | 600  | 行の主な文字・ボタンの文字         |
| `body`        | 17 / 22     | 400  | 本文                               |
| `subheadline` | 15 / 20     | 400  | 説明文・行の補足                   |
| `footnote`    | 13 / 18     | 400  | 注釈・小さな説明                   |
| `caption1`    | 12 / 16     | 500  | セクションの見出しラベル・バッジ   |
| `caption2`    | 11 / 13     | 600  | とても小さなバッジ                 |

✅ **決定（2026-10-15）**: 昔の段階（`title` 48 / `subtitle` 32 / `default` / `small` / `smallBold` / `link`）は**廃止**する。まだ約35か所で使われているので、見直しの中で上の段階へ置き換え、使われなくなったら `theme.ts` から削除する。

## 4. 余白

`Spacing` の値だけを使う: `half` 2 / `one` 4 / `two` 8 / `three` 16 / `four` 24 / `five` 32 / `six` 64。

- 画面の左右の余白: `four`（24）
- カード同士・セクション同士の間: `three`（16）〜 `four`（24）
- カードの内側: `three`（16）
- 行の高さ: 最低 **44pt**（iPhoneで指で押しやすい最小の大きさ）

## 5. 角の丸み

✅ **決定（2026-10-15）**: Stitch案にあった20・32は足さず、今ある値で代用する（値の種類を増やさないため）。

| 部品                               | 丸み | トークン            |
| ---------------------------------- | ---- | ------------------- |
| 小さなバッジ・タグ                 | 8    | `Radius.small`      |
| ボタン・カードの中の部品           | 12   | `Radius.smallLarge` |
| カード                             | 16   | `Radius.medium`     |
| 下から出るシートの上の角           | 16   | `Radius.medium`     |
| ダイアログ・完了画面の大きなカード | 24   | `Radius.large`      |
| 丸（アイコンの背景・ピル型ボタン） | 999  | `Radius.pill`       |

## 6. 部品と使い方

| 部品           | 使う場面                                                                 | 実体                                       |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| **主ボタン**   | その画面でいちばんしてほしい操作。**1画面に1つ**。画面の下部・横いっぱい | `PrimaryButton`                            |
| **副ボタン**   | 主ボタンと並ぶもう1つの選択肢（やらない・また今度など）                  | 🟠 共通部品が無い（各画面で手書き）        |
| **文字ボタン** | 戻る・閉じる・スキップ・変更など、軽い操作                               | `ThemedText`（`primary` 色）＋ `Pressable` |
| **危険な操作** | 削除・初期化。必ず確認ダイアログを挟む                                   | `danger` 色                                |
| **カード**     | 関連する情報のまとまり                                                   | `Card`                                     |
| **行**         | カードの中の1項目。左にアイコン、右に値か「›」                           | 各画面で実装（🟠 共通化の候補）            |
| **ダイアログ** | その場で少しだけ入力・確認するとき                                       | `Dialog`                                   |
| **バッジ**     | 「要確認」「連携済み」「登録先」など、状態を一言で                       | 各画面で実装                               |
| **はこブー**   | 解析中・完了・要確認・チュートリアル・案内                               | `HakobuMascot`（PR #17）                   |

**守ること**

- AIの確からしさ（`confidence`）は**数字で出さない**。「要確認」など言葉のバッジだけ（CLAUDE.md の開発原則）
- 押せる部品は、見た目で押せると分かるようにする（青い文字・「›」・ボタンの形）
- 押せない状態は `disabled` 色にし、**理由を近くに書く**（例: 「写真を選ぶと押せます」）

✅ **決定（2026-10-15）: 主ボタンは「青（`primary` = `#007AFF`）・ピル型（`Radius.pill`）・横いっぱい」**。副ボタンも同じピル型で、白地＋`border` の枠＋`primary` の文字。

- 10色を比べた結果、押せる文字・タブ・選択中の印と同じ青に揃えることにした（「青いもの＝押せる」が全体で揃う）
- ただし**画面によっては青でないほうが良い場所もある**ので、グループごとの見直しで都度判断する（例外にしたら、ここに理由とともに書き足す）
- 外した色: はこブーピンク・オレンジ（白文字が読みにくい）、インディゴ・ティール（PROの紫・成功の緑と意味が混ざる）

## 7. Stitchへ毎回添える指示

グループごとにStitchへ改善を頼むときは、スクショと一緒にこの文を必ず添える。

```text
You are improving screens of an existing iPhone app (React Native / Expo). Keep it consistent with this design system. Do not invent a new style.

Product: "シフToカレ" - reads a photo of a shared shift schedule with AI and registers only the user's own shifts to Apple / Google Calendar.
Users: Japanese university students with part-time jobs. They glance at the app one-handed between classes or on a train. Prioritize speed and low cognitive load over visual richness. Native iOS utility feel. Friendly but trustworthy.

Design system (must follow):
- Colors: Apple iOS system colors only. Page background #F2F2F7, cards #FFFFFF, primary #007AFF, success #34C759, danger #FF3B30, orange #FF9500, purple #5E35B1, secondary text #8E8E93, separators #E5E5EA. Must also work in dark mode.
- Typography: iOS text styles only (Title1 28/34 bold, Title2 22/28 bold, Title3 20/25, Headline 17/22 semibold, Body 17/22, Subheadline 15/20, Footnote 13/18, Caption1 12/16, Caption2 11/13).
- Spacing: 4 / 8 / 16 / 24 / 32. Screen side padding 24. Minimum tap target 44pt.
- Corner radius: badges 8, inset elements 12, cards and bottom sheets 16, dialogs 24, buttons fully rounded (pill).
- Row icons sit inside soft tinted circles (e.g. blue background #E8F2FF with #007AFF icon).
- One primary button per screen: full-width pill (fully rounded), filled #007AFF with white text. Secondary button: same pill shape, white with a #E5E5EA border and #007AFF text.

Hard rules:
- Never show AI confidence as a number or percentage. Use a text badge such as "要確認" only.
- Do not add features, settings, prices, plans, email addresses, version numbers, or progress indicators that are not in the screenshot.
- Keep all Japanese text as it is unless it is clearly unclear.
- Use realistic but fictional data.
```

## 8. 今のコードとのずれ（見直しの中で直す候補）

| 場所                                   | ずれ                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/app/photo-select.tsx`             | `MOCK_COLORS` で13色を直接書いている（Tailwindの灰色系と `#0066FF`）。白の背景も直接指定で、**ダークモードで崩れる可能性** |
| `src/app/(tabs)/settings.tsx`          | PROカードの背景 `#F5F5F7`、ボタン `#1C1C1E` などを直接指定                                                                 |
| `src/app/paywall.tsx` ほか             | 星アイコンの白など                                                                                                         |
| 文字                                   | 昔の段階が約35か所。`fontSize` の直書きが約50か所（16・12・13など）                                                        |
| 角の丸み                               | 直書きが約20か所（4・6・10・14など、表に無い値）                                                                           |
| 主ボタン                               | 黒・角丸16（`PrimaryButton`）と青（写真選択の「解析する」）が混在。**青・ピル型に揃える**                                  |
| 副ボタン                               | チュートリアル・案内の出口などで同じ見た目を手書きで重複                                                                   |
| `src/components/circular-progress.tsx` | PR #17 以降どこからも使われていない                                                                                        |

> 引き継ぎメモにある「基調色 `#0066FF`」は、写真選択画面の `MOCK_COLORS.blue` から来た値と思われる。アプリ全体の主色は `#007AFF`（`theme.ts`）なので、こちらに揃える。

## 9. 見直しの進め方（2026-10-15 ユーザー決定）

グループ（A. 毎日使うタブ / B. スキャンの流れ / C. 初回体験 / D. 設定の下の画面 / E. 課金）ごとに、次を繰り返す。

1. 私がグループの画面を（状態ごとに）確認し、**「どこを・なぜ・どう直すか」の方針をユーザーに共有**する
2. ユーザーとディスカッションを重ね、**問題ないと判断してもらってから**、Stitch用のプロンプトを作る（「7. Stitchへ毎回添える指示」＋グループ固有の指示）
3. 架空のデータで撮ったスクショとプロンプトをStitchに渡す（ログインはユーザー）
4. 出てきた案を一緒に見て選び、コードに反映する
