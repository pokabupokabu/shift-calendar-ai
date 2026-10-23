import { isShiftTypeRegistered, type ShiftAnalysisResult } from '@/models';
import { hasUsableTimeRange } from '@/utils/shiftTime';

import type { AnalyzeShiftImagesInput } from './types';

/**
 * どのAIにも共通の「指示文」「応答の形」「応答の後処理」。
 * AIの会社を替えても読み取りの決まりが変わらないよう、各 Provider はここを使い、
 * 自分では通信の形（リクエスト・レスポンスの包み方）だけを持つ。
 */

/**
 * AIが埋める応答の形（JSON Schema）。ShiftAnalysisResult（src/models/aiAnalysis.ts）と
 * 項目を1対1で揃えてあるので、検証を通った応答はそのまま型どおりに扱える。
 *
 * ここは各社に共通の最小限の書き方（OpenAPI の部分集合）にとどめる。会社ごとに必要な
 * 追加の決まり（例: Anthropic は全オブジェクトに additionalProperties: false が必須）は、
 * 各 Provider が送る直前に足す。
 */
export const SHIFT_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    shifts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          startTime: { type: 'string', description: 'HH:mm（isAllDay が true のときは空文字）' },
          endTime: { type: 'string', description: 'HH:mm（isAllDay が true のときは空文字）' },
          shiftType: { type: 'string' },
          isOvernight: { type: 'boolean' },
          isAllDay: {
            type: 'boolean',
            description: '時刻を特定できず終日として扱う場合のみ true',
          },
          confidence: { type: 'number' },
        },
        required: [
          'date',
          'startTime',
          'endTime',
          'shiftType',
          'isOvernight',
          'isAllDay',
          'confidence',
        ],
      },
    },
    userMatch: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['matched', 'ambiguous', 'not_found'] },
        candidates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rowLabel: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['rowLabel', 'confidence'],
          },
        },
      },
      required: ['status', 'candidates'],
    },
    warnings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['code', 'message'],
      },
    },
  },
  required: ['shifts', 'userMatch', 'warnings'],
} as const;

function buildMatchingTask(input: AnalyzeShiftImagesInput): string {
  if (input.confirmedRowLabel) {
    return `1. 画像内のシフト表の構造（誰の行が誰のシフトか）を理解する。
2. ユーザーは既に、表内で「${input.confirmedRowLabel}」と記載されている行が自分の行であることを確認済みである。この行を本人の行として直接使用し、再度あいまいさを判断し直さない。
3. userMatch.status は必ず "matched" にし、candidates には rowLabel="${input.confirmedRowLabel}", confidence=1 の1件のみを入れる。
4. その行に対応するシフトのみを shifts に抽出する。`;
  }

  if (input.shiftTableHasNoNames) {
    return `1. ユーザーは設定で「自分のシフト表には人の名前が記載されていない」と明示している。本人専用のシフト表として扱う。
2. 誰の行が誰のものかを特定しようとしない。candidates は空配列にする。
3. userMatch.status は必ず "matched" にする。
4. 表に記載されている勤務をすべて本人のシフトとして shifts に抽出する。`;
  }

  // 手順2の後ろの「ただし、…」の一文は、名前が読めない複数人の表を「本人専用の表」と取り違えて
  // 全員分のシフトをでっち上げるのを止めるために足した（docs/ai-model-comparison-2026-10.md「指示文を直した版」）。
  return `1. 画像内のシフト表の構造（誰の行が誰のシフトか）を理解する。
2. まず、表に人の名前や個人を区別する列・行が存在するかを判断する。本人専用の勤務表や月間カレンダー形式のシフト表のように人名が一切記載されていない場合、その表は丸ごと本人のものである。このときは userMatch.status を "matched"、candidates を空配列にし、記載されている勤務をすべて shifts に抽出する。人名が無いことを理由に "not_found" にしてはならない。ただし、本人専用の表とみなしてよいのは、1つの日付に勤務が1つしか書かれていない表だけである。同じ日付に複数の人の勤務が並んでいる（勤務の行や列が複数ある）のに名前が読めない場合（見切れ・ぼかし・判読できない）は、本人専用の表とみなしてはならない。このときは userMatch.status を "not_found"、shifts を空配列にし、warnings に理由を書く。
3. 人名の記載がある場合のみ、ユーザー本人の名前「${input.shiftName}」に該当する行を表内から探す。完全一致だけでなく、表記ゆれ・姓のみ・名前の一部のみの記載も候補として考慮する。
4. 該当行が1つに絞り込める場合のみ userMatch.status を "matched" とし、その行のシフトだけを shifts に抽出する。
5. 複数の行が候補になり得て確信を持って1つに絞れない場合は userMatch.status を "ambiguous" にし、shifts は空配列のままにして candidates に候補を列挙する。
6. 人名の記載があるにもかかわらず該当する行が見つからない場合にのみ userMatch.status を "not_found" にし、shifts は空配列にする。
7. 本人の行が曖昧なときに、絶対に自分で1つを勝手に決めつけない。`;
}

/** AIへ画像と一緒に渡す指示文。どのAIにも同じ文面を送る。 */
export function buildShiftAnalysisPrompt(input: AnalyzeShiftImagesInput): string {
  // 時刻が未登録のシフト種別は対応表に載せない（名前だけ渡すと「名前と一致したら対応表の時間を使う」
  // 指示と噛み合わず、AIが時刻を補ってしまうおそれがあるため）。
  const registeredShiftTypes = input.knownShiftTypes.filter(isShiftTypeRegistered);
  const knownShiftTypesText =
    registeredShiftTypes.length > 0
      ? registeredShiftTypes
          .map((type) => `- ${type.name}: ${type.startTime}〜${type.endTime}`)
          .join('\n')
      : '(まだ登録なし)';

  return `あなたはシフト表を解析するアシスタントです。添付された1枚以上の画像は、アルバイト先のシフト表の写真またはスクリーンショットです。

# あなたのタスク
${buildMatchingTask(input)}

# シフト種別の扱い
以下は過去にユーザーが登録・修正した「シフト種別 → 時間」の対応表です。
${knownShiftTypesText}

対応表の時間を使えるのは、**その日のセルに対応表の名前そのものが記載されている場合だけ**である。記載が無い日や、対応表のどの名前とも一致しない記載の日に、対応表の時間を当てはめてはならない（他の日の時間を流用することも禁止）。画像内に明記された時間があれば、常に対応表より優先する。

時刻の決め方は次の優先順位に厳密に従う。
1. その日のセル（または凡例）に時刻が明記されている → その時刻を使う
2. 時刻の記載は無いが、対応表の名前と一致する記載がある → 対応表の時間を使う
3. どちらにも当てはまらない → **時刻を推測せず** isAllDay を true にする（下記の抽出ルール参照）

# 各シフトの抽出ルール
- date は "YYYY-MM-DD" 形式（西暦4桁）。年が画像から読み取れない場合は、直近の妥当な年を推定する。
- startTime / endTime は "HH:mm" 形式（24時間表記）。上記の優先順位1か2で時刻を決められた場合のみ埋め、isAllDay は false にする。
- 上記の優先順位3に当たる日（勤務があることは分かるが、時刻を決める根拠が画像内にも対応表にも無い日）は、isAllDay を true、startTime と endTime を空文字 ""、isOvernight を false にする。**存在しない時刻を書いてはならない。** 名前だけが書かれた月間カレンダー形式のシフト表などがこれに当たる。
- 「休み」「公休」「有給」「－」「—」「/」「×」など、その日に勤務がないことを示す記載の日は shifts に含めない。勤務時間が読み取れる日だけを抽出する。
- 夜勤など日付をまたぐシフトは isOvernight を true にし、endTime には翌日側の時刻をそのまま入れる（例: 22:00〜翌07:00 なら startTime="22:00", endTime="07:00", isOvernight=true）。
- confidence は 0〜1 の数値で、その1件の読み取りにどれだけ自信があるかを表す内部値（UIには数値のまま出さない）。文字が不鮮明・時刻やシフト種別の記載が曖昧な場合は低い値にする。
- warnings には、画像が暗い/ぼやけている/一部が欠けている等、解析全体に影響した問題があれば code（英数字の短い識別子）と message（日本語の説明）を入れる。問題がなければ空配列にする。

# 出力
必ず指定されたJSON Schemaに従った1つのJSONオブジェクトのみを出力する。説明文や前置きは一切含めない。`;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Minimal shape check so a malformed/partial response fails loudly instead of corrupting app state. */
function assertShiftAnalysisResult(value: unknown): asserts value is ShiftAnalysisResult {
  if (
    !isPlainObject(value) ||
    !Array.isArray(value.shifts) ||
    !isPlainObject(value.userMatch) ||
    typeof value.userMatch.status !== 'string' ||
    !Array.isArray(value.userMatch.candidates) ||
    !Array.isArray(value.warnings)
  ) {
    throw new Error('AIの応答が想定した形式ではありませんでした。');
  }
}

/**
 * 終日シフトの表記をアプリ側の約束どおりに揃える。
 * モデルが isAllDay を立てたのに時刻を埋めてきた場合や、逆に時刻として読めない値を
 * 返してきた場合に、画面と給与計算が「時刻のあるシフト」と誤認しないようにする。
 * （存在しない時刻を自信満々に返すモデルが実在するため、ここで食い止める）
 */
function normalizeAllDayShifts(result: ShiftAnalysisResult): void {
  for (const shift of result.shifts) {
    if (shift.isAllDay || !hasUsableTimeRange(shift.startTime, shift.endTime)) {
      shift.isAllDay = true;
      shift.startTime = '';
      shift.endTime = '';
      shift.isOvernight = false;
    } else {
      shift.isAllDay = false;
    }
  }
}

/**
 * AIが返したJSONの文字列を ShiftAnalysisResult に直す（形の確認・終日の正規化・元画像の記録）。
 * AIは応答したが中身が使えなかった場合なので、失敗は通常の Error で投げる（回数は消費する）。
 */
export function parseShiftAnalysisText(
  text: string,
  input: AnalyzeShiftImagesInput,
): ShiftAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AIの応答をJSONとして解釈できませんでした。');
  }

  assertShiftAnalysisResult(parsed);
  normalizeAllDayShifts(parsed);

  if (input.images.length === 1) {
    parsed.sourceImage = input.images[0].uri;
  }

  return parsed;
}
