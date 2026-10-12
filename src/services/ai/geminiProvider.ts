import { env } from '@/config/env';
import type { ShiftAnalysisResult } from '@/models';
import { hasUsableTimeRange } from '@/utils/shiftTime';

import type { AIProvider, AnalyzeShiftImagesInput } from './types';

/**
 * OpenAPI-subset schema Gemini must fill in (responseSchema), mirroring
 * ShiftAnalysisResult (src/models/aiAnalysis.ts) field-for-field so the
 * parsed JSON can be trusted to match that type without extra coercion.
 */
const RESPONSE_SCHEMA = {
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

  return `1. 画像内のシフト表の構造（誰の行が誰のシフトか）を理解する。
2. まず、表に人の名前や個人を区別する列・行が存在するかを判断する。本人専用の勤務表や月間カレンダー形式のシフト表のように人名が一切記載されていない場合、その表は丸ごと本人のものである。このときは userMatch.status を "matched"、candidates を空配列にし、記載されている勤務をすべて shifts に抽出する。人名が無いことを理由に "not_found" にしてはならない。
3. 人名の記載がある場合のみ、ユーザー本人の名前「${input.shiftName}」に該当する行を表内から探す。完全一致だけでなく、表記ゆれ・姓のみ・名前の一部のみの記載も候補として考慮する。
4. 該当行が1つに絞り込める場合のみ userMatch.status を "matched" とし、その行のシフトだけを shifts に抽出する。
5. 複数の行が候補になり得て確信を持って1つに絞れない場合は userMatch.status を "ambiguous" にし、shifts は空配列のままにして candidates に候補を列挙する。
6. 人名の記載があるにもかかわらず該当する行が見つからない場合にのみ userMatch.status を "not_found" にし、shifts は空配列にする。
7. 本人の行が曖昧なときに、絶対に自分で1つを勝手に決めつけない。`;
}

function buildPrompt(input: AnalyzeShiftImagesInput): string {
  const knownShiftTypesText =
    input.knownShiftTypes.length > 0
      ? input.knownShiftTypes
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

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
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
 * Sends the shift table image(s) to Gemini via the gemini-shift-proxy Cloudflare
 * Worker (server/gemini-proxy) — the real Gemini API key lives only in that
 * Worker's secrets, never in this client bundle (see README "8. 不明点・リスク" 1).
 * Parses the JSON response into a ShiftAnalysisResult.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  constructor(
    private readonly model: string,
    private readonly proxyUrl: string = env.ai.proxyUrl,
    private readonly proxySecret: string = env.ai.proxySecret,
  ) {}

  async analyzeShiftImages(input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult> {
    if (!this.proxyUrl || !this.proxySecret) {
      throw new Error(
        'EXPO_PUBLIC_AI_PROXY_URL / EXPO_PUBLIC_AI_PROXY_SECRET is not set. Add it to .env (see .env.example).',
      );
    }
    if (input.images.length === 0) {
      throw new Error('解析する画像がありません。');
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(input) },
            ...input.images.map((image) => ({
              inlineData: { mimeType: image.mimeType, data: image.base64 },
            })),
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    };

    let response: Response;
    try {
      response = await fetch(`${this.proxyUrl}/v1beta/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-secret': this.proxySecret,
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new Error(
        'AIサーバーへの通信に失敗しました。通信環境を確認してもう一度お試しください。',
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => undefined);
      const message =
        isPlainObject(errorBody) && isPlainObject(errorBody.error)
          ? String(errorBody.error.message ?? response.statusText)
          : response.statusText;
      throw new Error(`AI解析に失敗しました（${response.status}）: ${message}`);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;

    if (data.promptFeedback?.blockReason) {
      throw new Error(
        `画像の内容によりAIが解析を拒否しました（${data.promptFeedback.blockReason}）。`,
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('AIから解析結果を取得できませんでした。');
    }

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
}
