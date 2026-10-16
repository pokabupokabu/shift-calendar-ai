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
