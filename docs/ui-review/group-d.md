# UI見直し グループD（設定の下の画面）

進め方は `group-a.md` と同じ（スキル `stitch-ui-review`）。修正前の画像は `.stitch-work/group-d/before/`（架空データ・幅375・2倍、2026-10-20）。

修正案のページ: https://claude.ai/artifact/MjZmr9FVPujdiePpMhbyVC

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
