# UI見直し グループA（毎日使うタブ）

共通ルールは `docs/design-system.md`。進め方は同ファイルの「9. 見直しの進め方」。

## サブグループの分け方（2026-10-16）

撮った19枚を、画面の区切りで5つに分けた（4・4・4・5枚だと合計17枚で合わないため）。

| 順  | サブグループ     | 枚数 | 中身                                                |
| --- | ---------------- | ---- | --------------------------------------------------- |
| ①   | カレンダー本体   | 5    | 月表示（無料）、リスト表示、空の月、空のリスト、PRO |
| ②   | カレンダーの詳細 | 3    | 日付を押したときの詳細、編集、勤務のない日          |
| ③   | 給与             | 4    | 無料（上・下）、PROの扶養の壁、生まれ年が未設定     |
| ④   | マイカスタム     | 4    | 無料（上・中・下）、PRO                             |
| ⑤   | 設定             | 3    | 無料（上・下）、PRO                                 |

各サブグループは「修正前の画面と修正案を共有 → 決定 → Stitch → 直しを繰り返す → 固まったらサブエージェントが実装し、その間に次のサブグループへ」の順で進める。

## サブグループ① カレンダー本体

修正案のページ: https://claude.ai/artifact/3A6HvcS6dYZCvXhM8yLfqY

### 決定事項（2026-10-16 ユーザー決定）

| #   | 項目                 | 決定                                                                                                                     |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ①   | 見出し               | 28pt（`title1`）にする                                                                                                   |
| ②   | 月／リストの切り替え | 少し大きくする。選んでいない側の文字を濃くして背景に紛れないようにする。切り替え全体を枠線で囲う                         |
| ③   | 月送りの矢印         | 今のまま（見えない余白で押せる範囲は48ptある）                                                                           |
| ④   | 日付マスのシフト名   | カレンダー部分だけ左右の余白を24→8ptに詰め、日付の**隣**に「早番」と出す。**地の色なし・種別の色の文字だけ**。時刻は残す |
| ⑤   | カレンダーを見に行く | ピル型・**薄いベージュ**（共通ルールの例外。文字色とダークモードの色はStitchの案を見て決める）                           |
| ⑥   | リスト表示           | カードの形はそのまま。アイコンだけシフト種別のものにする（種別が無い勤務は今のカレンダーの絵）                           |
| ⑦   | 空の月               | 案内は足さない                                                                                                           |
| ⑧   | 空のリスト           | 今の一言のまま                                                                                                           |
| ⑨   | PRO                  | 広告が無くて空いた分、日付マスを縦に広げる                                                                               |

**④の補足**

- シフト名が3文字以上のときは先頭2文字だけ出す（「…」で省略しない）
- 根拠（Expo Webで実測、2026-10-16）: 今の1マスは幅44.7pt（画面375pt）。日付の数字「28」は16pt、「早番」「夜勤」は11ptの太字で22pt
  - 余白を詰めた後の1マス: 画面375ptで約49〜50pt、393ptで約52pt
  - 必要な幅: 枠線2＋内側の余白4＋日付16＋すき間2＋シフト名22 = **46pt**（地の色を付けると左右の余白4が足されて50pt）
  - 地の色を付けると SE・mini（375pt）で余裕が0〜1ptしかないため、地の色なしを選んだ
- 撮った画面で右の余白が広く見えたのは、ブラウザペインが画面を縮めて表示していたため。実際は左右とも24pt
- iPhoneの文字サイズを大きくしている人への上限（`maxFontSizeMultiplier`）は、実装のときに日付マスだけ付ける

### Stitchへの指示文

`docs/design-system.md` の「7. Stitchへ毎回添える指示」の後ろに、次を続けて貼る。添付する画像は5枚（月表示・リスト・空の月・空のリスト・PRO）。

```text
Task: Improve the 5 attached screenshots of the Calendar tab ("カレンダー"). Output one screen per screenshot, in this order:
1. Month view, free plan (ad placeholder "広告" at the bottom)
2. List view
3. Month view with no shifts
4. List view with no shifts
5. Month view, PRO plan (no ad)
Design at 375pt width (iPhone SE / mini); it must also work at 393pt. Keep the overall structure. Apply ONLY the changes below.

All screens:
- Large title "カレンダー": Title1 (28/34 bold). It is too big now.
- The "月 / リスト" switch (right of the "今月: 15日勤務" badge): make it slightly larger, give the unselected segment a darker text color so it does not blend into the background, and surround the whole switch with a thin border.
- Keep the "‹ 2026年10月 ›" month arrows as they are.
- Keep the bottom tab bar exactly as it is.

Month view (screens 1, 3, 5):
- Make the calendar grid wider: side padding 8pt for the grid only (the title and header row keep 24pt). Inner padding of the grid card and of each day cell: 2pt.
- Day cell, first line: the date number (12pt bold) and, on the SAME line right next to it, the shift name in full, e.g. "早番" / "遅番". Shift name = colored text only, NO background pill, Caption2 (11pt semibold), in the shift type's color. Never truncate with "…". If a name is longer than 2 characters, show only its first 2 characters.
- Below that: start time and end time on two lines, 11pt, inside the soft tinted block (as now).
- If a day has 2 or more shifts, show the first one and put "+1" on its own line under the times.
- "カレンダーを見に行く ›" button: full-width pill, filled with a soft light beige (start around #F3EBDD), dark text. Suggest the matching dark-mode colors too. This is an intentional exception to the blue primary button rule: on this screen the blue round scan button in the tab bar is the main action, so this button must not be blue.
- Screen 5 (PRO): there is no ad, so use the freed vertical space to make the day cells taller.
- Screen 3 (no shifts): do NOT add any empty-state message, illustration or extra button.

List view (screens 2, 4):
- Keep one card per shift, as now.
- Replace the generic calendar icon on each card with the shift type's icon in its soft tinted circle: "早番" = sun (orange tint), "遅番" = sunset (purple tint), "夜勤" = moon (blue tint). A shift without a type keeps the calendar icon.
- Screen 4 (no shifts): keep the single line "この月のシフトはまだありません" as it is. Do NOT add anything.
```

### Stitchのやり取りの記録

Stitchのプロジェクト名は「Shift Calendar UI Redesign」。書き出したHTMLと、iPhoneの画面サイズで撮った画像は `.stitch-work/group-a-1/`（Gitの対象外）にある。iPhoneサイズの表示は `.claude/launch.json` の `stitch-preview` を起動し、`group-a-1/iphone-preview.html?v=<版>` を開く。

| 版  | 送った内容                                                       | 結果                                                                                                                                                               |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 上の指示文＋スクショ5枚                                          | シフト名が1文字（早／遅）のまま。マスの見た目が画面ごとにバラバラ。SEではPROのマスを伸ばすと最後の週がタブバーに隠れる。見出しの上の余白とタブバーが画面ごとに違う |
| 2   | 下の4点（シフト名・区切り線・PROの高さ・見出しとタブバーの統一） | 下の「2回目の結果」を参照                                                                                                                                          |

2回目に送った指示（1回目の5画面に対して）:

```text
Revise the 5 Calendar tab screens you generated from my screenshots (1. month view free, 2. list view, 3. month view with no shifts, 4. list view with no shifts, 5. month view PRO). Output 5 new screens in this same order. Keep everything else exactly as it is now and apply ONLY these 4 changes:

1. Shift name in day cells: show the FULL name "早番" / "遅番" (2 characters), NOT just "早" / "遅". Colored text only (no background), Caption2 11pt semibold, on the same line right next to the date number. If a name is longer than 2 characters, show only its first 2 characters. Never truncate with "…".
2. Day cells: use ONE style on all month screens (1, 3, 5): no individual rounded boxes and no borders around each cell; separate the days only with thin hairline lines (#E5E5EA) between cells, like the iOS Calendar app.
3. Screen 5 (PRO): the whole calendar and the "カレンダーを見に行く" button must fit without scrolling on an iPhone SE screen (375x667, including the 20pt status bar and the bottom tab bar). Only on taller screens, stretch the day cells to use the extra height left by the removed ad.
4. Make the header and the tab bar identical on all 5 screens: the same top spacing above the "カレンダー" title (no extra blank space), the same positions for the title, the "今月" badge and the 月/リスト switch, and the same bottom tab bar (same height and icons). Do not draw a home indicator bar inside the screen.

Do not add anything else.
```

2回目の結果（iPhone SE 375×667 と iPhone 16 393×852 の画面サイズで確認）:

- できた: シフト名が「早番」「遅番」と全部出る（遅番は紫の文字になった）。月表示と空の月は細い区切り線で揃った。祝日（10月12日）が赤に戻った。今日の日付は青い丸に変わった
- 直っていない: PROはSEだと「カレンダーを見に行く」がタブバーに隠れる。PROだけ区切り線が無い。見出しの上の余白が画面ごとに違う（約50〜86pt）
- 空のリストは2回目の版が作られなかった（1回目の版を流用して確認）

### 確定（2026-10-16 ユーザー決定）

**2回目の案で確定。** 今日の日付の「青い丸に白い数字」（Stitchが2回目で足した形）も採用。

Stitchで直りきらなかった次の2点は、実装側で直す:

- 見出しの上の余白とタブバー: Stitchの数値は使わず、アプリ既存の作り（SafeArea・既存のタブバー）のまま
- PROのマスの高さ: 画面の高さを測って、余った分だけ伸ばす（iPhone SEでもボタンまでスクロールなしで収まること）

ベージュのボタンのダークモードの色は暫定（温かみのある濃いグレー）。実装後にダークモードの画面を撮ってユーザーに確認する。

実装はサブエージェントに依頼（worktreeで作業。コミットはまだしない）。

## サブグループ② カレンダーの詳細

修正案のページ: https://claude.ai/artifact/CJQNqvevgeJB2T7A6fCP6H

対象は、カレンダーで日付を押したときの「詳細」「編集」「勤務のない日」の3枚。

### 決定事項（2026-10-16 ユーザー決定）

| #   | 項目                                 | 決定                                                                                                                                                                                           |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 上の取っ手（横棒）                   | 消す（真ん中に出る箱のまま。引っぱっても閉じないのに取っ手があったため）                                                                                                                       |
| 2   | 「閉じる」（3画面とも）              | 副ボタン（白地＋枠＋青文字のピル型）                                                                                                                                                           |
| 3   | 右上の種別バッジの色                 | シフト種別の色に揃える（日付マスと同じ）                                                                                                                                                       |
| 4   | 「自動控除」のタグ                   | タグそのものを無くす                                                                                                                                                                           |
| 5   | 編集・削除がカレンダーに反映されない | 詳細には足さない。**編集画面と削除の確認画面**に一言足す（例「アプリ内の記録だけ変わります。カレンダーの予定はそのままです」）                                                                 |
| 6   | 「編集する」「シフトを削除」         | 見た目はそのままで、押せる範囲を44ptに広げる                                                                                                                                                   |
| 7   | 日付・時刻の入力                     | **日付の入力欄は無くす**（日付は箱の上に出ているので固定でよい）。**時刻は回して選ぶ形、15分刻み**                                                                                             |
| 8   | 編集中のボタン                       | **「キャンセル」は無くし、「閉じる」（副ボタン）と「保存」を横に並べる**。「保存」は押せる範囲を大きく、文字も大きく（色はStitchの案を見て決める）。編集中の「閉じる」は編集をやめて箱を閉じる |
| 9   | 勤務のない日                         | 今のまま一言を出す。「閉じる」は2の副ボタンに揃える                                                                                                                                            |

**実装のときの論点**

- 7の「回して選ぶ形」の部品はまだアプリに入っていない。iPhone標準の部品（`@react-native-community/datetimepicker`）を足すか、自前で作るかを実装前に決める。標準の部品はネイティブの部品なので、Expo Webでは動かない（Webでの確認用の代わりが要る）。EAS Buildはまだ一度も作っていないので、ネイティブの部品を足しても追加のビルドの手間は増えない
- ダイアログの土台（`src/components/dialog.tsx`）は7画面で共通。地の色（ダークモードで画面の黒と同じになる問題）は②では直さず、全画面まとめて直すときに扱う
- ①の実装と同じ `calendar-view.tsx` を触るので、②の実装は①の実装を取り込んでから行う

**追加の決定（2026-10-16）**

- シフト種別の色: アイコン未設定の基本3種も、マイカスタムの既定（早番＝太陽・オレンジ、遅番＝夕日・紫、夜勤＝月・青）をアプリ全体で使う（①の実装で `resolveShiftTypeTone` が常に青を返していたのを揃える）
- ②の8は上の表のとおり「キャンセルを無くし、閉じると保存を横並び」に変更

### Stitchへの指示文（②）

`docs/design-system.md` の「7. Stitchへ毎回添える指示」の後ろに続けて貼る。添付する画像は3枚（詳細・編集・勤務のない日）。

```text
Task: Improve the dialog that appears when the user taps a date in the Calendar tab. The 3 attached screenshots show it over the dimmed calendar. Output 4 screens, in this order:
1. Detail of a day with a shift (screenshot 1)
2. Edit mode of that shift (screenshot 2)
3. Delete confirmation of that shift (not in the screenshots; see "Screen 3" below)
4. A day with no shift (screenshot 3)
Design at 375pt width. Keep it a centered dialog (not a bottom sheet). Keep the dimmed calendar behind it as it is. Apply ONLY the changes below.

All dialogs:
- Remove the gray grabber bar at the top of the dialog (the dialog cannot be dragged).
- "閉じる" button: not black. Use the secondary button style: full-width pill, white fill, thin #E5E5EA border, #007AFF text.

Screen 1 (detail):
- The shift type badge at the top right ("遅番"): use the shift type's color instead of always blue: "早番" = orange tint, "遅番" = purple tint, "夜勤" = blue tint (soft tinted background with the strong color as text).
- Remove the small "自動控除" tag next to the break time ("休憩時間 0分"). Keep the value.
- "編集する" and "シフトを削除": keep their look, but make each tap area at least 44pt tall.
- Do not add any note to this screen.

Screen 2 (edit mode):
- Remove the date field ("日付 2026-10-14"). The date is already shown in the dialog title and cannot be changed.
- "開始時刻" and "終了時刻": tapping a field opens an iOS-style wheel time picker with 15-minute steps (00 / 15 / 30 / 45). Show the wheel open for "開始時刻" in this screen.
- Add one small footnote: "アプリ内の記録だけ変わります。カレンダーの予定はそのままです".
- Buttons: remove "キャンセル". Put two buttons side by side at the bottom: "閉じる" (secondary pill, narrower) on the left and "保存" (wider, larger text) on the right. Suggest a fitting style for "保存" (it is the main action here).
- Do not show any other "閉じる" button in this screen.

Screen 3 (delete confirmation, shown inside the detail dialog after tapping "シフトを削除"):
- Today it is only a small red "本当に削除しますか？" with small text links "キャンセル" and "削除する". Make it clear and safe: the question, the same small footnote "アプリ内の記録だけ変わります。カレンダーの予定はそのままです", and two buttons side by side: "キャンセル" (secondary pill) and "削除する" (red, #FF3B30).

Screen 4 (a day with no shift):
- Keep the date title and the single line "この日のシフトは登録されていません" as it is. Only change "閉じる" to the secondary pill.
```

### ②の確定（2026-10-16 ユーザー決定）

**Stitchの1回目の案で確定**（指示文と書き出したHTMLは `.stitch-work/group-a-2/`）。

- 詳細の各行の左に付いた丸い地のアイコン（Stitchが足したもの）も採用
- 削除の確認はStitchの案のまま（文言「このシフトを削除しますか？」、勤務時間と金額の要約、ゴミ箱の絵、注意書き、「キャンセル」「削除する（赤）」）
- 編集画面の時刻を回す部分は、StitchのHTMLだと選ばれている時刻（例「17」「00」）が空欄に見える。HTMLの表示崩れなので、実装で正しく表示させる

### ①の追加の確定（2026-10-16）

- ダークモードの「カレンダーを見に行く」ボタンの色は、暫定のまま確定（地 `#3A3530`・文字 `#F3EBDD`）

## サブグループ③ 給与

修正案のページ: https://claude.ai/artifact/8Wh1JhynnYeQivd2nd7pj4

対象は給与タブの「無料・上」「無料・下」「PRO・扶養の壁」「生まれ年が未設定」の4枚と、明細を押したときの小窓の1枚（計5枚）。①②の実装を取り込んだworktree（8083番）で、架空データを使って撮り直した（2026-10-16、幅375・2倍）。画像は `.stitch-work/group-a-3/`。

修正案は15項目（ルールどおり6・提案2・要相談7）。

### 決定事項（2026-10-16 ユーザー決定）

| #   | 項目                            | 決定                                                                                                                                                                                                               |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 大見出し                        | カレンダーと同じ28ptの「給与」を置き、その下に月送りの行                                                                                                                                                           |
| 2   | 無料のときの月送りの矢印        | 矢印の横に小さな鍵マークを付ける。押すと課金画面へ進むのは今のまま                                                                                                                                                 |
| 3   | 合計金額の大きさ                | 28pt（`title1` の大きさ）。共通ルールに「大きな金額は大見出しと同じ大きさでよい」と追記済み                                                                                                                        |
| 4   | 時給換算                        | **消す**（勤務・実働の2つだけにする）                                                                                                                                                                              |
| 5   | PROの札と鍵の色                 | **金にする**（紫ではなく。プレミアムな印象にしたいため）。共通ルールの「紫＝PRO」を「金＝PRO」に書き換え済み。設定タブ・課金画面のPROも金にそろえる。金の値はStitchの案を見て決める                                |
| 6   | 「PROにアップグレード」         | 青い主ボタン（ピル型・横いっぱい）                                                                                                                                                                                 |
| 7   | 種別の絞り込み                  | ①の「月／リスト」の切り替えと同じ形（少し大きく、選んでいない側の文字を濃く、枠線で囲う、押せる範囲44pt）                                                                                                          |
| 8   | 「↑昇順」「すべて ⌄」           | **今のまま**                                                                                                                                                                                                       |
| 9   | 明細の行のアイコン・札          | ①のリスト表示と同じ（シフト種別の絵と色。種別が無い勤務はカレンダーの絵）                                                                                                                                          |
| 10  | 時刻と実働                      | 2行に分ける。1行目に日付と種別の札、2行目に「09:00〜17:00・実働7時間」（「h」をやめて「時間」）。折り返さない長さに収める                                                                                          |
| 11  | 想定給与の色                    | シフト種別の色（早番＝オレンジ、遅番＝紫、夜勤＝青）                                                                                                                                                               |
| 12  | 広告がスキャンボタンに重なる    | **今のまま**                                                                                                                                                                                                       |
| 13  | 扶養の壁カードの説明文          | 下の注意書きと住民税の一言は**設定タブに新しく作る項目へ移す**。壁ごとの説明は短い一言だけカードに残す。カードの下に青い文字の「詳しい説明・年齢の設定 ›」を付ける。「19〜22歳の方向け」の一言は**強調表示**にする |
| 14  | 生まれ年が未設定のとき          | 壁は出さず、「生まれ年を設定すると、あなたに合った壁が表示されます」と青い「生まれ年を設定する」ボタン（行き先は13の新しい項目）。年収見込みの合計は今どおり出す                                                   |
| 15  | 明細などの小窓（給与タブの3つ） | ②と同じ形（「閉じる」は副ボタン、種別は種別の色の札、各行の左に丸い地のアイコン）                                                                                                                                  |

**実装のときの論点**

- 13・14の「設定タブの新しい項目」（扶養の壁の詳しい説明と、年齢の設定）は新しい画面になる。中身と置き場所は⑤設定（またはグループD）で詰める。今の生まれ年の設定は「アカウント」の画面（`/settings/account`）にあるので、移すか両方に置くかも決める。③の実装では、カードからの入口とボタンの行き先だけ先に用意する
- 10の2行目「09:00〜17:00・実働7時間」は、iPhone SE（375pt）で右の金額と並べると幅が足りない見込み。実装時に実測し、収まらなければ金額の列を詰めるか、実働を3行目に分ける
- 5の金の色は新しいトークン（`gold`）として `theme.ts` に足す。ライト・ダーク両方の値と、札の文字色（濃い茶色）を決める
- 13の「19〜22歳の方向け」の強調の仕方（太字・色・札など）はStitchの案を見て決める
- はこブーの帽子をPROで金（またはシルバー）にするのは**ゆくゆく**の希望で、③の範囲外

### Stitchへの指示文（③）

`docs/design-system.md` の「7. Stitchへ毎回添える指示」の後ろに続けて貼る（つないだ全文は `.stitch-work/group-a-3/prompt.txt`）。添付する画像は5枚（無料・上、無料・下、PRO・扶養の壁、生まれ年が未設定、明細の小窓）。出してもらう画面は4枚（無料の上下は1枚の長い画面にまとめる）。

```text
Task: Improve the Payroll tab ("給与") from the 5 attached screenshots. Output 4 screens, in this order:
1. Payroll tab, free plan, as ONE full-length scrolling page (screenshots 1 and 2 are the top and the bottom of the same page)
2. Payroll tab, PRO plan, with the dependency wall card (screenshot 3)
3. Payroll tab, PRO plan, when the birth year is not set (screenshot 4)
4. The dialog that opens when the user taps a row in "簡易明細一覧" (screenshot 5)
Design at 375pt width (iPhone SE / mini); it must also work at 393pt. Keep the overall structure. Apply ONLY the changes below.

Header (screens 1-3):
- Add a large title "給与" at the top left: Title1 (28/34 bold), the same as the Calendar tab title "カレンダー".
- Below the title, keep the month row "‹ 2026年10月 ›" as it is.
- Screen 1 (free plan) only: put a small lock icon right next to each arrow. The arrows stay blue and tappable (they open the PRO upgrade screen). Screens 2 and 3 (PRO) have no lock icons.
- Keep the bottom tab bar exactly as it is.

Total card ("10月の合計見込み"):
- Amount "113,250円": number in Title1 size (28pt bold, blue); keep "円" smaller as now.
- Footer: show only "勤務 15日" and "実働 93.5時間". REMOVE "時給換算1,211円" completely.

Free plan card "扶養の壁アラート" (screen 1 only):
- "PRO" tag: gold fill with dark brown text (not orange). The lock icon sits in a soft gold-tinted circle with a gold icon. Use a yellow-leaning gold that cannot be confused with the warning orange #FF9500, and make sure the text is readable.
- Replace the black button with the standard primary button: full-width pill, filled #007AFF, white text "PROにアップグレード".

Shift type filter ("すべて / 早番 / 遅番"):
- Make it slightly larger (each segment at least 44pt tall), give the unselected segments a darker text color so they do not blend into the background, and surround the whole control with a thin border.

"簡易明細一覧" list:
- Keep "↑ 昇順" and "すべて ⌄" exactly as they are.
- Replace the generic calendar icon on each row with the shift type's icon in its soft tinted circle: "早番" = sun (orange tint), "遅番" = sunset (purple tint), "夜勤" = moon (blue tint). A shift without a type keeps the calendar icon.
- The small shift type badge next to the date uses the same shift type color (orange tint for 早番, purple tint for 遅番), not always blue.
- Second line: "09:00〜17:00・実働7時間" on ONE line. It must never wrap at 375pt width, next to the amount on the right.
- Keep "もっと見る（残り10件）".

"シフト種別毎の想定給与" (screen 1):
- Color the dot and the progress bar by shift type: "早番" = orange, "遅番" = purple. Keep everything else.
- Keep the ad placeholder "広告" at the bottom as it is. PRO screens have no ad.

Screen 2 (PRO, dependency wall card "2026年の年収見込みと扶養の壁"):
- Keep the header with the orange warning icon.
- The line "2026年12月31日時点で19〜22歳の方向けの目安です。": emphasize the part "19〜22歳の方向け" so it stands out (suggest a style, e.g. bold or a soft tinted highlight).
- Each wall keeps its label, "残り…円" and progress bar, with ONE short line under it in Footnote (13pt, regular weight, not bold):
  - "150万円の壁": "超えると親の社会保険の扶養から外れます"
  - "178万円の壁": "超えた分にだけ所得税がかかります"
- Keep the divider and the row "2026年の合計見込み 113,250円".
- REMOVE the long notes at the bottom ("登録済みのシフトのみの集計です。…" and "住民税は自治体によって…"). Instead, add one blue text link row at the bottom of the card: "詳しい説明・年齢の設定 ›".

Screen 3 (PRO, birth year not set):
- Same card header as screen 2.
- Do NOT show any wall (no "130万円の壁", no "178万円の壁", no progress bars) and remove the gray box.
- Instead show the line "生まれ年を設定すると、あなたに合った壁が表示されます" and a primary button (full-width pill, #007AFF, white text) "生まれ年を設定する".
- Keep the row "2026年の合計見込み 113,250円".

Screen 4 (dialog over the dimmed Payroll tab):
- Centered dialog, corner radius 24, no grabber bar.
- Title "10/2（金）" with the shift type badge "早番" (orange tint) at the top right of the dialog.
- Rows: "勤務時間 09:00〜17:00", "実働時間 7時間", "休憩時間 60分", "給与見込み 8,400円" (the amount slightly emphasized). Put a small icon in a soft tinted circle at the left of each row (clock, timer, coffee cup, yen coin).
- "閉じる": secondary button (full-width pill, white fill, thin #E5E5EA border, #007AFF text). Not black.
```

- 壁ごとの短い一言（「超えると親の社会保険の扶養から外れます」「超えた分にだけ所得税がかかります」）は指示文用の仮の文。実装では `resolveDependencyWalls` の説明文（今は長い文）を短くする必要があり、文言はStitchの案と一緒にユーザーに確認する
- 設定タブの新しい項目（13・14の行き先）の画面は③では作らない（⑤設定で扱う）

### Stitchのやり取りの記録（③）

Stitchのプロジェクト名は「ShiftToCal iOS Payroll Screens」（2026-10-16作成、`https://stitch.withgoogle.com/projects/17842133410464231297`）。

| 版  | 送った内容                                      | 結果                      |
| --- | ----------------------------------------------- | ------------------------- |
| 1   | 上の指示文＋画像5枚                             | 下の「1回目の結果」を参照 |
| 2   | 下の「2回目に送る指示」（1回目の3画面に対して） | 送信済み（2026-10-18）    |

1回目の結果（4画面。iPhone SE 375×667 と iPhone 16 393×852 の画面サイズで確認。画像は `.stitch-work/group-a-3/v1-iphone/`）:

- できた: 大見出し「給与」、無料の矢印の横の鍵、時給換算の削除、PRO札の金（地 `#FFD60A`・文字 `#5C3D00`、鍵の丸は地 `#FFF8E1`・絵 `#B48200`）、青い「PROにアップグレード」、明細の種別の絵と札の色、想定給与の色（早番オレンジ・遅番紫）、壁ごとの短い一言（13pt・普通の太さ）、「19〜22歳の方向け」の強調（淡い青の地に青の太字）、「詳しい説明・年齢の設定 ›」、生まれ年が未設定のときの案内とボタン、小窓（副ボタンの「閉じる」・行のアイコン・種別の札）
- 直っていない: 明細の2行目「09:00〜17:00・実働7時間」が**iPhone SEでは全部の行で「実働7…」と省略**される。iPhone 16でも「実働5.5時…」の行は省略される（実装前の見込みどおり、金額と並べると幅が足りない）
- 指示と違う: 無料の画面で「簡易明細一覧」の右に「すべて ⌄」が足されている（もともとは想定給与の見出しの右だけ）。種別の絞り込みが横いっぱいに広がった（①の「月／リスト」は横いっぱいではない）。178万円の壁の棒が青（今のアプリは所得税の壁を灰色にしている）
- 確認用のページ（決めてほしいA〜Cに印を付けたもの）: https://claude.ai/artifact/P8ekWRtdbGNbUQ3HvLMLYc
- **PROの金はこの色で確定**（2026-10-17 ユーザー決定）: 札の地 `#FFD60A`・文字 `#5C3D00`、鍵の丸の地 `#FFF8E1`・絵 `#B48200`。ダークモードの値は実装時に決めて確認する
- **1回目を見ての決定（2026-10-18 ユーザー決定）**
  - A 明細の2行目: **実働を行から外す**（時刻だけ。実働は行を押したときの小窓で見る）。決定10を変更
  - B 種別の絞り込み: **「簡易明細一覧」の小見出しと同じ行に、少し小さめで置く**（横いっぱいの行は無くす）。「↑昇順」は右端のまま。**並べるのは4つまで**で、4つ目は「その他 ⌄」にし、押すと残りの種別をプルダウンで選ぶ。決定7を変更
  - C 壁の棒の色: **150万円の壁・178万円の壁とも同じ決まりにする**。50%未満＝青、50%以上75%未満＝オレンジ（注意の色。黄色はPROの金と紛れるため）、75%以上＝赤。所得税の壁を灰色にしていた以前の方針から変更
  - Bの「4つまで」は「すべて＋種別2つ＋その他」と解釈した（種別が2つ以下ならその他は出さない）。iPhone SEの幅で1行に収まるかは2回目の案と実装で確かめる
- 気にしなくてよい: 生まれ年が未設定の画面の明細はStitchが作った別のデータ（10/24・「¥8,400」）。表示用ページでは状態バーが二重に見える（StitchのHTMLが自前で描いているため）

2回目に送る指示（1回目の画面1〜3に対して。全文は `.stitch-work/group-a-3/v2-task.txt`）:

```text
Revise the 3 Payroll tab screens you generated (1. free plan full page, 2. PRO with the dependency wall card, 3. PRO with birth year not set). Output 3 new screens in this same order. Do NOT change the dialog screen. Keep everything else exactly as it is now and apply ONLY these changes:

1. "簡易明細一覧" rows: the second line shows ONLY the time, e.g. "09:00〜17:00". Remove "・実働7時間" completely. Never truncate with "…".
2. Shift type filter: remove the separate full-width "すべて / 早番 / 遅番" row. Instead, put a smaller segmented control on the SAME line as the section title "簡易明細一覧", right after the title (Footnote-size text, about 28pt tall visually, but each segment keeps a 44pt tap area). Keep "↑ 昇順" at the right end of that line. The whole line must fit at 375pt width.
3. The segmented control shows at most 4 segments: "すべて", the first two shift types, and "その他 ⌄" when there are more types. "その他 ⌄" opens a small pull-down list of the remaining types. In screens 1 and 3 there are only 2 types, so show "すべて / 早番 / 遅番" with no "その他". In screen 2, use 4 types (早番, 遅番, 夜勤, 通し) so it shows "すべて / 早番 / 遅番 / その他 ⌄".
4. Screen 1: remove the extra "すべて ⌄" that you added next to "↑ 昇順". The only "すべて ⌄" stays next to "シフト種別毎の想定給与".
5. Screen 2, wall progress bars: color BOTH walls by the same rule: under 50% = blue #007AFF, 50% to under 75% = orange #FF9500, 75% and over = red #FF3B30. To show it, use a yearly total of "1,200,000円": "150万円の壁" is at 80% (red bar, "残り300,000円"), "178万円の壁" is at 67% (orange bar, "残り580,000円"). Update "2026年の合計見込み" to "1,200,000円".
6. Screen 3: use the same list data as screen 1 (10/2（金）早番 09:00〜17:00 8,400円, 10/3（土）遅番 17:00〜22:30 6,750円, …) with "円" after the amount, not "¥". The 遅番 icon is the sunset icon (purple tint), as in screen 1.

Do not add anything else.
```

2回目の結果（3画面。iPhone SE・iPhone 16の画面サイズで確認。画像は `.stitch-work/group-a-3/v2-iphone/`、確認用のページ: https://claude.ai/artifact/ExnuhMeWWkxabqnogo6ZoL）:

- できた: A 明細の2行目は時刻だけ（SEでも切れない）。B 絞り込みが「簡易明細一覧」と同じ行に入り、種別4つの例で「すべて・早番・遅番・その他 ⌄」と「↑昇順」がSEの幅でも1行に収まった。C 150万円の壁（80%）が赤、178万円の壁（67%）がオレンジ
- Stitchの案の小さなずれ（実装で直す）: PROの画面の「2026年の合計見込み」が113,250円のまま。生まれ年が未設定の画面で遅番の絵が月のまま。「その他 ⌄」を押したときのプルダウンは描かれていない（iPhone標準のメニューの形にする）。小さめの絞り込みも押せる範囲は指で押せる大きさに広げる

### ③の確定（2026-10-20 ユーザー決定）

**Stitchの2回目の案で確定**（明細の小窓は1回目の案）。書き出したHTMLは `.stitch-work/group-a-3/v2-export/`（小窓は `v1-export/dialog/`）。上の「Stitchの案の小さなずれ」は実装で直す。

実装はサブエージェントに依頼（worktreeで作業。ブランチは `feat/ui-calendar-detail`（PR #24）の上に `feat/ui-payroll` を作る。コミットはまだしない）。

### ③の実装（2026-10-20）

サブエージェントが worktree `.claude/worktrees/agent-ae3da038be6e08745`（ブランチ `feat/ui-payroll`、`feat/ui-calendar-detail` の上）で実装。lint・型・整形は通過。**まだコミットしていない**。8084番（`.claude/launch.json` の `expo-web-payroll`）で架空データを入れて表示を確認した（画像は `.stitch-work/group-a-3/impl/`）。無料・PRO（種別4つ・年収見込み約140万円で両方の壁が赤）・生まれ年が未設定・明細の小窓・「その他」の一覧・ダークモードとも、確定した案どおり。

ユーザーに確認が要る点（実装で決めたもの）:

- 絞り込みの文字は11pt（`caption2`）。footnote（13pt）だと4つ並べたときにiPhone SEの幅（左右24pt）を約30pt超えるため
- 金のダークモードの値: 札の地 `#FFD60A`・文字 `#4A3100`、鍵の丸の地 `#3A3014`・絵 `#FFD60A`
- 壁の短い一言: 150万円「超えると親の社会保険の扶養から外れます」、130万円「超えると親などの社会保険の扶養から外れます」、所得税の壁「超えた分にだけ所得税がかかります」
- 青い主ボタンは `PrimaryButton` に任意の `variant="bluePill"` を足して実現（既定は黒のまま。全画面の直しで既定を変える）
- 種別の並びはマイカスタムの並び順。生まれ年が未設定のときは「詳しい説明・年齢の設定 ›」の行を出さない（ボタンと行き先が同じため）

## サブグループ④ マイカスタム

修正案のページ: https://claude.ai/artifact/MCEk1BeW1YkQ7cuhrhzkLW

対象は、マイカスタムタブの「無料・上」「無料・中」「無料・下」「PRO」の4枚と、シフト種別を編集する小窓の1枚（計5枚）。①②の実装を取り込んだworktree（8083番）の画面を、架空データで撮った（2026-10-20、幅375・2倍。PROは勤務先2つ・シフト種別5つの例）。画像は `.stitch-work/group-a-4/`。

修正案は14項目（ルールどおり6・提案3・要相談5）。決定事項はこの下に追記する。
