# UI見直し グループD（設定の下の画面）

進め方は `group-a.md` と同じ（スキル `stitch-ui-review`）。修正前の画像は `.stitch-work/group-d/before/`（架空データ・幅375・2倍、2026-10-20）。

ページはサブグループごと（2026-10-20 ユーザーの希望。D1とD2が混ざって分かりにくいため）: D1 https://claude.ai/artifact/MjZmr9FVPujdiePpMhbyVC ／ D2 https://claude.ai/artifact/P2RuyXsqNude3jLHZvd7rr ／ D3 https://claude.ai/artifact/B7dkekyZ5QswAvF6N4Ju2n

## サブグループ（2026-10-20 ユーザー決定）

| 順  | サブグループ                             | 画面                                                           |
| --- | ---------------------------------------- | -------------------------------------------------------------- |
| D1  | アカウント設定＋新しい「扶養の壁」の画面 | アカウント設定（上・下・PRO・ダーク）。扶養の壁の画面は新規    |
| D2  | カレンダーまわり                         | 対応カレンダー・カレンダー連携・その他のカレンダー             |
| D3  | 文書                                     | 利用規約・特定商取引法に基づく表記・よくある質問・お問い合わせ |

ユーザーの指摘（2026-10-20）: 設定タブの各項目の画面は全体的に整理されておらず、**これまでのグループ以上に、画面の構成やデザインを根本から見直す**。細かい直しの前に「どの画面に何を置くか」から決める。

## 見つけたこと（修正前）

- グループDの全画面で、上のバーと大見出し（32pt）に同じ題名が2回出る
- 上のバーの色が、アプリの「外観」の設定ではなく端末の設定を見ている（`src/app/_layout.tsx` の `ThemeProvider` が `useColorScheme()`）。アプリだけダークにすると上のバーが白く浮く
- 設定タブの「登録先カレンダー」を押すと「対応カレンダー」が開くが、ここでは連携しかできず登録先は選べない（登録先はマイカスタムの勤務先ごと）。「その他のカレンダー」はマイカスタムからしか開けない
- 「アカウント設定」はログインが無いのに「アカウント」の名前で、プラン・扶養の壁・開発用のプロモーションコード・データの初期化の寄せ集め
- 文書は見出しの無い灰色の文字だけ。お問い合わせのメールアドレスは文章の中にあるだけ
- 購入の復元はペイウォールにしか無い（Appleの決まりはこれで満たす）

## 決定事項（2026-10-20 ユーザー決定）

| #     | 項目                         | 決定                                                                                                                                                                                                                                                                                                                             |
| ----- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | 題名の二重                   | **上のバーの題名だけ**にする（大見出しをやめる）。グループDの全画面                                                                                                                                                                                                                                                              |
| 2     | ダークモードの上のバー       | アプリの「外観」の設定に合わせる（上のバーが出る全画面に効く）                                                                                                                                                                                                                                                                   |
| 3     | プランのカード               | 最初は「残してボタンを青に・『現在のプラン』の1行は不要・PROには次回更新日など」→ 構成①で**アカウント設定ごと無くす**ことになり、**プランの項目は不要**。PRO向けの次回更新日・サブスクリプションの管理も**どこにも出さない**（観点を説明したうえでの判断）                                                                       |
| 構成① | アカウント設定               | **画面を無くす**。扶養の壁 → 設定タブの既存の「扶養の壁」の行（新しい画面）／プロモーションコード → 設定タブに**新しい行「プロモーション特典」**／データの初期化 → 設定タブに**新しい行**                                                                                                                                        |
| 構成② | 「プロモーション特典」の行   | **提出用の版でも出す**（案A）。押すとAppleのオファーコードの入力画面。開発用ビルドでは今の `DEVPRO` の欄も出す。将来は友達紹介などをこの中に足す                                                                                                                                                                                 |
| 構成③ | 設定タブの並び               | （無料のみ）PROの宣伝カード → 一般設定（カレンダー連携・扶養の壁・外観）→ **特典**（プロモーション特典）→ サポート・その他 → いちばん下に**赤い文字の「データを初期化」の行**（押すと確認）→ バージョン                                                                                                                          |
| 構成④ | 設定の「登録先カレンダー」   | **「カレンダー連携」に名前を変える**。右に連携済みのもの（例「Apple」）。開くと対応カレンダーとその他のカレンダーを1画面にまとめた画面。**登録先は今のままマイカスタムで勤務先ごと**（画面の中身はD2で詰める）                                                                                                                   |
| 10    | 新しい「扶養の壁」の画面     | 上から①短い説明（扶養の壁とは・給与タブに出る2本の壁）②アラートのオン・オフ（横に金の「PRO」の札）③年齢区分 ④学生区分 ⑤「住民税の壁は含めていません」などの注意。**無料の人も年齢区分・学生区分は設定できる**                                                                                                                    |
| 7     | 年齢の聞き方                 | **生まれ年をやめ、2択**「今年の12月31日時点で19〜22歳」「それ以外」（ユーザーの提案）。**何年の答えかも記録**し、年が変わったら未設定に戻して「今年の年齢区分を選んでください」と出す（22歳→23歳で壁が150万→130万に下がる人が、古い答えのまま130万を超える事故を防ぐため）。保存データの形が変わる（`birthYear` → 年と答えの組） |
| 8     | 学生区分                     | 年齢区分と同じ見た目の2択「昼間の学生」「それ以外」。下に「夜間・通信制の学生は『それ以外』」                                                                                                                                                                                                                                    |
| 5     | 扶養の壁の絵の色             | オレンジの丸にオレンジの三角（給与タブ・設定タブとそろえる）                                                                                                                                                                                                                                                                     |
| 6     | 小さすぎる注意書き           | 注釈用の13pt（`footnote`）・灰色・普通の太さ                                                                                                                                                                                                                                                                                     |
| 構成⑤ | 「プロモーション特典」の画面 | 上から①短い説明（キャンペーンなどで受け取ったコードを使える）②青いボタン「コードを入力」（Appleの入力画面）③お客様ID（押すとコピー。「特典のお問い合わせのときにお伝えください」）④開発用ビルドだけ `DEVPRO` の欄                                                                                                                |
| 9     | データの初期化               | 構成③のとおり、設定タブのいちばん下の**赤い文字の行**。押すと確認の小窓（今と同じ文言）。専用の画面は作らない                                                                                                                                                                                                                    |

### 「プロモーション特典」で今後できること（ユーザーに説明済み）

| やりたいこと           | できる？         | 方法・注意                                                                                          |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 友達に一定期間だけ無料 | できる           | オファーコード。期間後は自動で月額が始まる（期間の上限は商品作成時に画面で確認）                    |
| 友達に無期限で無料     | 条件付きでできる | RevenueCatの管理画面から特定の人に手作業でPROを付ける。相手を見分ける番号（お問い合わせ用ID）が要る |
| レビューで1週間無料    | できない         | 審査ガイドラインで禁止。誰がレビューしたか確かめる手段も無い。ステマ規制のおそれもある              |
| 全員に最初の1週間無料  | できる           | 導入オファー（App Store Connectで設定）                                                             |
| 紹介した人にお礼       | できる           | オファーコードを渡す。紹介の数え方は自前で作る必要があり、MVPの範囲外                               |
| やめた人を呼び戻す     | できる           | Appleの再登録の特典                                                                                 |

いずれも有料App契約とRevenueCatが動いてから。

### 追加の要望（2026-10-20）

- **お問い合わせ用IDを見られる場所を作る**（今後、特定の人にPROを付けるときなどのため）
  - → **「プロモーション特典」の画面の中に置く**（プロモーションのときしか要らないため）。名前は**「お客様ID」**。押すとコピーできる形

## D1 Stitchへの指示文

`docs/design-system.md` の「7. Stitchへ毎回添える指示」の後ろに続けて貼る（つないだ全文は `.stitch-work/group-d/d1/prompt.txt`）。添付する画像は4枚（`.stitch-work/group-d/d1/` の 1-設定-上・2-設定-下・3-アカウント設定-上・4-アカウント設定-下）。

```text
Task: Restructure the Settings area from the 4 attached screenshots (1-2: the current Settings tab "設定", top and bottom of one page; 3-4: the current "アカウント設定" screen, top and bottom of one page). The "アカウント設定" screen is being removed and its contents are split into the Settings tab and two NEW pushed screens. Output 4 screens, in this order:
1. 設定 tab, free plan, as ONE full-length scrolling page
2. NEW screen "扶養の壁", free plan, as ONE full-length scrolling page
3. NEW screen "プロモーション特典"
4. NEW screen "扶養の壁", dark mode (top of the page)
Design at 375pt width (iPhone SE / mini); it must also work at 393pt.

Pushed screens (2, 3, 4): use a standard iOS navigation bar with a back chevron "‹" on the left and the screen name as a small centered title ("扶養の壁" / "プロモーション特典"). Do NOT add a large title below the bar (the screen name must appear only once). The bar must follow light / dark mode.

Screen 1 - 設定 tab (keep the header, the PRO card, the ad and the tab bar exactly as in screenshot 1). Sections from top to bottom:
- Remove the "アカウント" section and its "アカウント設定" row completely.
- "一般設定" card: 1) "カレンダー連携" (renamed from "登録先カレンダー"; keep the soft red circle with the calendar icon; right side gray "Apple" then "›"). 2) "扶養の壁" (orange warning triangle in a soft orange circle; right side gray "19〜22歳" then "›"). 3) "外観" with the "ライト / ダーク" switch, unchanged.
- NEW section "特典" with one row "プロモーション特典": a gift icon in a soft BLUE circle, then "›". No right-side text.
- "サポート・その他" card: keep the 5 rows exactly as they are.
- NEW at the very bottom, as its own card: one row "データを初期化" in red text (#FF3B30), with a red trash icon in a soft red circle, no chevron. It is a destructive action that opens a confirmation dialog (do not draw the dialog).
- Keep "シフToカレ for iOS / バージョン 1.0.0" below everything.
- Section labels outside the cards: Caption1 (12pt), gray.

Screen 2 - 扶養の壁 (new). From top to bottom:
- A short explanation card (Footnote 13pt or Subheadline 15pt, gray, regular weight - not tiny bold text): "年収が「壁」と呼ばれる金額を超えると、親の扶養から外れたり、税金がかかったりします。給与タブで、今年の年収見込みと壁までの残りを表示します。"
- A card with a switch row: title "扶養の壁アラート", subtitle "給与タブに年収見込みと壁までの残りを表示", a small gold "PRO" tag next to the title (gold fill #FFD60A, dark brown text #5C3D00, radius 8). Switch on the right (iOS green when on).
- Section "年齢（2026年12月31日時点）": a 2-option segmented control, same style as the "ライト / ダーク" switch on the Settings tab: "19〜22歳" (selected) / "それ以外". Below it in Footnote gray: "社会保険の扶養の基準が変わります。年が変わったら選び直してください。"
- Section "学生区分": the same 2-option segmented control: "昼間の学生" (selected) / "それ以外". Below it in Footnote gray: "夜間・通信制の学生は「それ以外」を選んでください。"
- A note at the bottom in Footnote gray: "住民税の壁は含めていません。金額は目安です。"
- No birth year input anymore. No age number. No buttons.

Screen 3 - プロモーション特典 (new). From top to bottom:
- A short explanation in Subheadline gray: "キャンペーンなどで受け取ったコードを入力すると、特典を受け取れます。"
- The standard primary button "コードを入力" (full-width pill, filled #007AFF, white text).
- Section "お客様ID": one card row showing a fictional ID "SK-7Q4M-2XP9" in a monospaced-looking style with a copy icon on the right (tapping the row copies it). Below the card in Footnote gray: "特典についてお問い合わせいただくときにお伝えください。"
- Nothing else (no promo code text field, no prices, no plan names).

Screen 4 - the same "扶養の壁" screen as screen 2 in dark mode (page background #000000, cards #1C1C1E, text white, secondary text #8E8E93).
```

## D1 Stitchのやり取りの記録

Stitchのプロジェクト: `https://stitch.withgoogle.com/projects/4354302893102681059`（2026-10-20作成）。

| 版  | 送った内容          | 結果                |
| --- | ------------------- | ------------------- |
| 1   | 上の指示文＋画像4枚 | 下の「1回目の結果」 |

1回目の結果（4画面。iPhone SE・16の大きさで確認。画像は `.stitch-work/group-d/d1/v1-iphone/`、書き出しは `v1-export/{settings,fuyou,promo,fuyou-dark}/`）:

- 指示どおり: アカウントの欄の削除、「カレンダー連携（Apple）」「扶養の壁（19〜22歳）」、新しい「特典」の欄、いちばん下の赤い「データを初期化」、奥の画面は上のバーの題名だけ、扶養の壁の2択2つ、プロモーション特典の3つの部品、ダークモードの上のバー
- SEでも「…」で切れる所は無い
- 小さな点: 学生区分の下の一文の最後の「い。」だけ2行目に落ちる（文言を短くすれば直る）
- Stitchの描き方: 2択の部品が白いカードの中に入っていて枠が二重に見える
- Stitchの書き出しは幅1280の画面として出てきた（App のモードでも）。HTMLは幅に合わせて縮むので、iPhoneの大きさでの確認には問題なし

### D1の確定（2026-10-20 ユーザー決定）

**Stitchの1回目の案で確定**（書き出したHTMLは `.stitch-work/group-d/d1/v1-export/`）。実装での直し:

- 扶養の壁の画面の2択（年齢・学生区分）は**白いカードの中に入れず**、背景に直接置く（枠が二重にならないように）
- 注意書きは、2つの2択の**下にまとめて3つの箇条書き**にする:
  - 社会保険の扶養の基準が変わります。年が変わったら選び直してください。
  - 夜間・通信制の学生は「それ以外」に該当
  - 住民税の壁は含めていません。金額は目安です。
- （途中で「⚠️夜間・通信制の学生は『それ以外』に該当」という案も出たが、最後の並びの確認では箇条書きの「・」に決まった）
- タブバーの絵と見出しの右の葉っぱの絵はStitchの描き方。実装では今のタブバーと若葉（`Sprout`）のまま

### D1の実装の確認（2026-10-20）

サブエージェントが worktree `.claude/worktrees/agent-aaa60d35cfe7339ca`（ブランチ `feat/ui-settings-d1`、`main` 1e4671a から）で実装。8086番（`.claude/launch.json` の `expo-web-d1`）で架空データを入れて確認（画像は `.stitch-work/group-d/d1/impl/`）。保存データ v18 の移行で、生まれ年2006年が `ageBracket: { year: 2026, isAge19to22: true }` に移ることも確認した。依存関係に `expo-clipboard` を追加（ネイティブの部品なので、実機では開発用ビルドの作り直しが要る）。

実装を見て決めたこと（2026-10-20 ユーザー決定）:

- 給与タブで年齢区分が未回答のときの文言「今年の年齢区分（19〜22歳かどうか）を選ぶと、あなたに合った壁が表示されます」＋ボタン「今年の年齢区分を選ぶ」→ これでよい
- 「コードを入力」が使えないときの小窓の文言 → これでよい
- ダークモードの2択の選んだ側の色 → 設定タブの「外観」も**明るい灰色にそろえる**
- **学生区分は聞かない**（決定8を変更）。学生区分は壁の金額に効いておらず、給与タブの注意書き1行（勤務先の社会保険に入る決まりの対象外かどうか）の出し分けだけに使っていた。この決まりは年齢を問わないため「19〜22歳のときだけ聞く」は不可（1〜3月生まれの大学1年生・大学院生などに合わない）。注意書きは学生かどうかによらず2行とも出す。`isDaytimeStudent` は v18 の移行で消す

- **訂正（2026-10-20）**: 学生区分の注意書きは、③給与の見直しで給与タブのカードから外して以来、**どこにも表示されていなかった**（計算だけされていた）。説明の途中で「給与タブの注意書き1行に効いている」と誤って伝えたので訂正した
- 勤務先の社会保険の決まりを知らせる場所が無いので、**扶養の壁の画面の注意に足す**（ユーザー決定）。注意は「社会保険の扶養の基準が変わります。年が変わったら選び直してください。」「週20時間以上・従業員51人以上の勤務先では、年収に関わらず自分の社会保険に加入することがあります（昼間部の学生は対象外）。」「住民税の壁は含めていません。金額は目安です。」の3つ

## D2 カレンダーまわり

### 決定事項（2026-10-20 ユーザー決定）

| #   | 項目                                       | 決定                                                                                                                                                                                  |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 対応カレンダーとその他のカレンダー         | 新しい「カレンダー連携」の**1画面にまとめる**。上にApple・Googleの2行（状態と「連携する」）、下に「ほかのカレンダーアプリで見るには」の3つの手順。今の2画面は無くす                   |
| 2   | 連携する前の中間の画面（calendar-connect） | **無くす**。一覧の「連携する」ですぐGoogleのログイン／Appleの許可を出す。一覧の下に1行「許可は後からiPhoneの設定で変えられます」。マイカスタムからも同じ動き                          |
| 3   | Appleの「連携済み」                        | **iPhoneのカレンダーの許可を実際に確かめて**出す。許可が無ければ「未連携」、押すと許可を求める（今は許可が無くてもいつも連携済み＝`getConnectedProviders` がAppleを常に真にしている） |
| 4   | マイカスタムの「その他カレンダーとの連携」 | 行は残し、押すと新しい「カレンダー連携」の画面の手順の位置を開く                                                                                                                      |
| 5   | 表記ゆれ                                   | 画面の文言を「Google カレンダー」「Apple カレンダー」にそろえる（規約などの文書は変えない）                                                                                           |

### D2 Stitchへの指示文

添付する画像は4枚（`.stitch-work/group-d/d2/` の 1-対応カレンダー・2-カレンダー連携・3-その他のカレンダー・4-設定タブ）。全文は `.stitch-work/group-d/d2/prompt.txt`。

```text
Task: Merge three existing screens into ONE new pushed screen "カレンダー連携", using the 4 attached screenshots (1: current "対応カレンダー" list, 2: current in-between "Google カレンダーと連携" page, 3: current "その他のカレンダーで見る" guide, 4: the Settings tab that opens this screen from its "カレンダー連携" row - for style reference only, do not redesign it). Screens 1-3 are being replaced by the new screen; the in-between page (2) is removed. Output 3 screens, in this order:
1. カレンダー連携, Apple connected / Google not connected, light mode, as ONE full-length scrolling page
2. カレンダー連携, neither connected, light mode (top of the page is enough)
3. カレンダー連携, same state as screen 1, dark mode, as ONE full-length scrolling page
Design at 375pt width (iPhone SE / mini); it must also work at 393pt.

Navigation bar: standard iOS bar with a back chevron "‹ 設定" on the left and the small centered title "カレンダー連携". Do NOT add a large title below the bar (the screen name must appear only once). The bar must follow light / dark mode.

From top to bottom:
- A short lead in Subheadline gray: "シフトを登録するカレンダーと連携します。"
- One card with 2 rows, separated by a hairline:
  1) "Apple カレンダー": a calendar icon in a soft GRAY circle; under the name a Caption1 gray status "連携済み" or "未連携".
  2) "Google カレンダー": a calendar icon in a soft BLUE circle; same status line.
  Right side of each row: if connected, a small green check with "連携済み" (not a button). If not connected, a blue text button "連携する" with "›". Tapping "連携する" starts the iOS permission prompt / Google sign-in directly (do not draw any dialog).
- Below the card in Footnote gray: "許可は後からiPhoneの設定で変えられます。" and on the next line "登録先（どのカレンダーに入れるか）は、マイカスタムで勤務先ごとに選べます。"
- Section label (Caption1, gray): "ほかのカレンダーアプリで見るには"
- Body text in Subheadline gray (keep the wording): "シフToカレが直接登録できるのは Apple カレンダーと Google カレンダーの2つです。Jorte・Lifebear・Fantastical など、ほかのカレンダーアプリで見たい場合は、Google カレンダーを経由すると表示できる場合があります。"
- One card with the 3 numbered steps from screenshot 3, unchanged wording, each with a small gray number circle: "マイカスタムで「Google カレンダー」と連携し、登録先にする" / "使っているカレンダーアプリの設定で「Googleカレンダーと同期する」をオンにする" / "シフトを登録すると、そのアプリにも表示される場合がある"
- Below it in Footnote gray with a small info icon: "同期の方法や反映までの時間は、それぞれのカレンダーアプリによって異なります。"
- No buttons at the bottom, no big illustration card, no prices, no other features.
- Always write "Apple カレンダー" / "Google カレンダー" (never "Google Calendar").
```

### D2 Stitchのやり取りの記録

Stitchのプロジェクト: `https://stitch.withgoogle.com/projects/1611427046835374762`（2026-10-20作成）。

1回目の結果（3画面。画像は `.stitch-work/group-d/d2/v1-iphone/`、書き出しは `v1-export/{light,none,dark}/`）: 指示どおりで、SEでも切れる所は無い。

1回目を見ての決定・指摘（2026-10-20）:

- 「連携済み」が名前の下と右の2回出ていた → **右側だけにする**（名前の下の状態の文字はやめる）
- ユーザーの指摘: **文字ばかりで見づらい。すっきりかつ見やすいUIに**。→ 3つの方向（A 最小／B タイル＋図／C 一覧＋図＋短い手順）をスマホ画面の見本にしてD2のページに載せた。手順の1つ目の文言の質問は、方向が決まってから
- **方向はC（一覧＋図＋短い手順）に決定**（2026-10-20 ユーザー決定）。Stitchで2回目を出す

2回目に送った指示（全文は `.stitch-work/group-d/d2/v2-task.txt`）:

```text
Revise the 3 screens you generated (1. Apple connected / Google not connected, light, full page; 2. neither connected, light; 3. same state as 1 in dark mode). Output 3 new screens in this same order. The current design has too much text and is hard to scan. Keep the navigation bar and the 2-row card, and apply ONLY these changes:
1. Remove the lead sentence "シフトを登録するカレンダーと連携します。" and the footnote "許可は後からiPhoneの設定で変えられます。". Keep only one footnote under the card, in Footnote gray: "登録先はマイカスタムで勤務先ごとに選べます。"
2. In the 2-row card, remove the small gray status text under each calendar name. Show the status only on the right side ("✓ 連携済み" in green, or "連携する ›" in blue).
3. Replace the whole "ほかのカレンダーアプリで見るには" part (the long paragraph, the 3 long steps and the info note) with:
   - Section label (Caption1, gray): "ほかのアプリで見るには"
   - One card with a simple horizontal flow diagram of 3 nodes with small gray arrows between them: [blue calendar icon] "シフToカレ" → [blue calendar icon] "Google カレンダー" → [gray app icon] "Jorte など". Each icon in a soft tinted circle, its label in Caption1 gray under the icon.
   - One card with 2 short numbered steps, each with a small blue number circle: "上で Google カレンダーと連携" and "アプリ側で Google と同期をオン".
4. Nothing else on the page: no paragraph text, no extra notes, no buttons.
Keep everything else exactly as it is now.
```

2回目の結果（画像は `.stitch-work/group-d/d2/v2-iphone/`、書き出しは `v2-export/{light,none,dark}/`）: 見本Cのとおり。SEでも切れる所は無い。実装で直す小さな点: 図の「Google カレンダー」が画面によって2行に折り返す → 1行に収める／図の右端の絵が画面ごとに違う → 1つに決める

### D2の確定（2026-10-20 ユーザー決定）

**Stitchの2回目の案（Cの方向）で確定**（書き出したHTMLは `.stitch-work/group-d/d2/v2-export/{light,none,dark}/`）。実装で直す小さな点: 図の「Google カレンダー」は1行に収める／図の右端の絵は1つに決める。

### D2の実装の確認（2026-10-20）

サブエージェントが worktree `.claude/worktrees/agent-ae805517b12c72010`（ブランチ `feat/ui-settings-d2`、`feat/ui-settings-d1` の上）で実装。8087番（`expo-web-d2`）で確認（画像は `.stitch-work/group-d/d2/impl/`）。ブラウザではカレンダーの許可を読めないため、Apple も Google も「連携する」で写る（「✓ 連携済み」は実機でしか見られない）。

- Apple の判定は expo-calendar の `getCalendarPermissions()`（聞かずに読むだけ）。共通の型に `hasCalendarPermission()` を追加
- 許可を断られたときの案内: 「カレンダーへのアクセスが許可されていません」「iPhoneの「設定」アプリ →「シフToカレ」→「カレンダー」から、あとで許可できます。」［閉じる］［設定を開く］（登録の確認画面でも同じ案内になる）
- 設定の「カレンダー連携」の画面の「連携する」は登録先を変えない。マイカスタムの「連携する」は、連携できたらその勤務先の登録先にする（今までどおり）

実装を見て決めたこと（2026-10-20 ユーザー決定）:

- ダークモードで灰色の丸がカードと同じ色で見えない → **全画面共通の灰色の丸（`IconBadgeTones.dark.neutral`）を #2C2C2E に**
- マイカスタムの連携カレンダーの欄も、**名前の下の状態の文字を無くし、右側だけ**にする（登録先＝緑の札／登録先にする／連携する ›）。「登録先なのに未連携」を名前の下で出す案は不要

### D2の追加の決定（2026-10-21 ユーザー決定）

- **マイカスタムの「必須基本情報」を3行にする**: ①登録者キーワード ②**登録先カレンダー**（登録者キーワードと同じ2行の表示。上に小さく「登録先カレンダー」、下に「Apple カレンダー」など。右に「変更 ›」）③**その他カレンダーとの連携**（名前はそのまま。押すと「カレンダー連携」の画面）。カードの中の小さな見出し「連携カレンダー」とApple・Googleの2行はやめる（Apple・Googleは③の先からも連携できるため）
- ②の「変更」は、**登録者キーワードと同じようにその場の小窓**でApple・Googleから選ぶ。未連携の方を選んだら、その場で連携してから登録先にする（従来どおり）
- 「カレンダー連携」の画面は今のまま（連携だけ、登録先は選ばない）。文言を変える: 見出し「ほかのカレンダーアプリと連携したい場合」、手順「シフToカレと Google カレンダーを連携」「連携したいアプリ側で Google と同期する」、いちばん下に footnote「詳しい操作は、お使いのカレンダーアプリのヘルプや設定画面をご確認ください。」（「Google カレンダー」は空白入りの表記にそろえた）
- 手順の文が幅375ptで最後の1〜2文字だけ2行目に落ちた → **文字を少し小さくして1行に収める**
- ダークモードで小窓の地が背景に溶ける（全画面共通の小窓 `dialog.tsx`）→ **ダークモードのときだけ白い細い枠線を付ける**（ライトは変えない）。最初は白の22%の濃さにしたが薄すぎたため、**真っ白（#FFFFFF）の1ptの枠で小窓全体を囲む**ことにした（2026-10-21 ユーザー決定）

## D3 文書

修正前の画像は `.stitch-work/group-d/before/{07,08,09,10,13,14,15,16,17}-*.jpg`（2026-10-21 追加撮影）。

見つけたこと:

- 5つの文書（よくある質問・お問い合わせ・利用規約・プライバシーポリシー・特定商取引法に基づく表記）は、どれも `src/constants/legalContent.ts` の1つの長い文字列を、灰色の同じ大きさの文字でそのまま出しているだけ（`src/app/settings/legal/[slug].tsx`）。見出し（「第1条（適用）」「1. 取得する情報」）も本文と同じ見た目
- お問い合わせのメールアドレスは文中にあるだけで押せない
- 文の中身の食い違い: ① よくある質問がダミーのまま（「設定タブの『本人情報』」という無い項目に触れている）② 利用規約の第3条とプライバシーポリシーに、無くした「表示名」を保存するとある ③ 今保存している「年齢区分」がプライバシーポリシーに無い
- 文書の文字列は、未公開の法務ページの静的サイト（`feat/legal-site` の `scripts/build-site.mjs`）でも同じものを使うので、データの形は変えず、画面の側で見出しなどを見つけて形を変える方針で提案

### D3 決定事項（2026-10-21 ユーザー決定）

| #   | 項目         | 決定                                                                                                                                                                                                                  |
| --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 本文の色     | 黒（ダークでは白）の15pt。灰色は補足の注記だけ（5つの文書すべて）                                                                                                                                                     |
| 2   | 見出し       | 「第1条（適用）」「1. 取得する情報」などの見出しの行を太字（17pt）にし、条ごとに間を空ける。文言はそのまま、見た目だけ変える                                                                                          |
| 3   | よくある質問 | **質問をカードで並べ、右端の「＋」を押すと答えが開く**（ユーザーが参考の画像で指定。閉じているときは質問だけ、開くと答えが下に出て「－」になる）。左に「Q」「A」の丸。色は Q=青・A=灰色（色の決まりに合わせた私の案） |
| 4   | お問い合わせ | メールアドレスを押すとコピーできる行＋「メールを作成」ボタン（宛先・件名「シフToカレのお問い合わせ」・本文に機種・iOS・アプリの版を最初から入れる）。知らせてほしいことは一覧に                                       |
| 5   | 特商法       | 項目名（灰色・小）と内容（黒）を1行ずつ並べた一覧。文言は変えない                                                                                                                                                     |

ユーザーの依頼（2026-10-21）: **利用規約とプライバシーポリシーの文言は自分ではレビューできないので、法務のプロのつもりで添削してほしい。これまでの修正（表示名の廃止・年齢区分・プロモーション特典・お客様ID など）を元に追記すべき事項も考えてほしい。** → 弁護士ではないため法律相談の代わりにはならないことを伝えたうえで、一次情報を確かめて添削案を作る

### 規約・ポリシーの添削のために確かめた事実（2026-10-21、コードで確認）

- **AIへ送っているのは画像だけではない**: `src/services/ai/geminiProvider.ts` の指示文に、利用者本人の名前（`shiftName`＝登録者キーワード）と、登録したシフト種別の名前・時刻が入っている。今のプライバシーポリシーは「画像を送る」とだけ書き、名前などは「端末内にのみ保存」としているので**事実と違う**
- **Googleカレンダーの権限は `https://www.googleapis.com/auth/calendar.events`**（`googleCalendarProvider.ts`）。予定の閲覧も含む権限なので、ポリシーの「予定作成・編集に限定」は**正確でない**
- 中継サーバー（Worker）は `generativelanguage.googleapis.com` の `v1beta` を呼ぶ。**Gemini API が無料枠か有料（課金有効）か**で、送ったデータがGoogleの改善に使われるかが変わる可能性がある → ユーザーに確認が必要（コードからは分からない）
- 調査はテーマ別に3つのサブエージェントで並行（①規約の有効性＝消費者契約法・定型約款・未成年 ②個人情報保護法・電気通信事業法の外部送信規律・Google API の Limited Use・Gemini の利用規約 ③App Store の審査ガイドライン・EULA・サブスクの表示・オファーコード・AdMob）
- Gemini API のプロジェクトは**課金を有効にしている**（2026-10-21 ユーザー回答）
- **自分で原文を確認した（2026-10-21）**: ① Gemini API Additional Terms（https://ai.google.dev/gemini-api/terms 、Effective March 23, 2026）に「You must be 18 years of age or older to use the APIs.」「You also will not use the Services as part of a website, application, or other service … that is directed towards or is likely to be accessed by individuals under the age of 18.」。有料（課金が有効な Cloud Project）では「Google doesn't use your prompts … or responses to improve our products」。② App Review Guidelines 5.1.2(i)「You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so.」
- 🔴 **方針の判断が要る**: 18歳未満（アルバイトをする高校生）の扱い／初めて解析する前の同意画面（5.1.2(i)）／配信国（EEA・英国・スイスを含めるとAdMobの同意の仕組みが必要）／規約・ポリシーの公開URL（App Store Connect の必須欄・GoogleのOAuth審査。`feat/legal-site` は未公開）

### D3 Stitchへの指示文（2026-10-21 作成・送信済み）

Stitchのプロジェクト: `projects/14865294426237983048`（2026-10-21、ユーザーのOKを得て1回目を送信）

添付する画像は4枚（`.stitch-work/group-d/d3/` の 1-利用規約・2-よくある質問・3-お問い合わせ・4-特商法）。全文は `.stitch-work/group-d/d3/prompt.txt`（`docs/design-system.md` 7章＋`task.txt`）。

- 出す画面は5枚: ①利用規約（ライト・第3条あたりまで）②よくある質問（1つ目だけ開いた状態）③お問い合わせ ④特商法 ⑤利用規約（ダーク）。プライバシーポリシーは利用規約と同じ見た目になるので出さない
- **文言は変えない**ことを明記。よくある質問は今のダミーのうち3つ（「本人情報」という無い項目に触れる問いは外した）を見た目の確認用に使う。中身は別途書き直す
- 規約・ポリシーの文言の直し（`docs/legal-review-2026-10.md`）は、AIの会社が決まってから。見た目の直しとは切り離す

### D3 Stitchのやり取りの記録

| 版    | 結果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1回目 | 5枚（利用規約・よくある質問・お問い合わせ・特商法・利用規約のダーク）。書き出しは `.stitch-work/group-d/d3/v1-export/`、iPhoneサイズは `v1-iphone/`。決めた5項目はどれも指示どおり。聞くこと: ①本文を白いカードに入れるか（Stitchはカードを選んだ）②ダークだけ見出しに青い棒・条の間に線がある ③特商法の連絡先が青いリンク＋コピーのアイコンになった。聞かずに直すこと: 英語の題名、右上の人のアイコン、足された制定日・版・注記・一文、Stitchが書き換えた文言（第3条・返品・動作環境）、ダークなのに上のバーと地が明るい |

### D3 1回目を見ての決定（2026-10-21 ユーザー決定）

| #   | 項目                           | 決定                                                                         |
| --- | ------------------------------ | ---------------------------------------------------------------------------- |
| 1   | 規約・ポリシーの本文           | **白いカード1枚に入れる**（Stitchの案のまま）                                |
| 2   | 見出しの飾り                   | **太字だけにそろえる**（ダークの青い棒・条の間の線・青い番号は使わない）     |
| 3   | 特商法の連絡先のメールアドレス | **ほかの項目と同じ黒い字だけ**（リンクにもコピーにもしない。私の推しとは別） |

### D3の確定（2026-10-21 ユーザー決定）

Stitchの1回目＋上の3つの決定で確定（2回目は出さない）。実装はブランチ `feat/ui-settings-d3`（`origin/main` から）。文書の文言（`src/constants/legalContent.ts`）は変えず、画面の側で見出し・項目・Q&Aを見つけて形を変える。規約・ポリシーの文の直しとよくある質問の中身は、AIの会社が決まってから別に行う。

### D3の実装の確認（2026-10-22）

- worktree `.claude/worktrees/agent-aaa5a0ad667c74e5e`（ブランチ `feat/ui-settings-d3`）。8088番（`.claude/launch.json` の `expo-web-d3`）で架空データ・ライト／ダーク・iPhone SE／16で撮影。画像は `.stitch-work/group-d/d3/impl/`、ページは https://claude.ai/artifact/B7dkekyZ5QswAvF6N4Ju2n の「D3 実装の確認」
- 新規 `src/utils/legalBlocks.ts`（本文の文字列を部品に分ける）、`src/components/legal/{legal-text.ts,legal-article,legal-faq,legal-contact,legal-fields}.tsx`。変更 `src/app/settings/legal/[slug].tsx`。`legalContent.ts` は差分なし。5つの文書の全101行が元の文と一致（esbuild＋Nodeで確認）
- ユーザー決定（2026-10-22）: コピーしたときは**絵がチェックに変わるだけ**（文は出さない）／よくある質問のダミーの但し書きは**書き直すまで出しておく**
- 実機でしか確かめられないこと: 「メールを作成」でメールアプリが開き、件名・機種・iOS・アプリの版が入るか。`Device.modelName` / `osVersion` の値。開閉の動き
