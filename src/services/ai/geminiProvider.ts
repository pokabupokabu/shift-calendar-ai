import { env } from '@/config/env';
import type { ShiftAnalysisResult } from '@/models';

import type { AIProvider, AnalyzeShiftImagesInput } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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
          startTime: { type: 'string', description: 'HH:mm' },
          endTime: { type: 'string', description: 'HH:mm' },
          shiftType: { type: 'string' },
          isOvernight: { type: 'boolean' },
          confidence: { type: 'number' },
        },
        required: ['date', 'startTime', 'endTime', 'shiftType', 'isOvernight', 'confidence'],
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

function buildPrompt(input: AnalyzeShiftImagesInput): string {
  const knownShiftTypesText =
    input.knownShiftTypes.length > 0
      ? input.knownShiftTypes
          .map((type) => `- ${type.name}: ${type.startTime}〜${type.endTime}`)
          .join('\n')
      : '(まだ登録なし)';

  return `あなたはシフト表を解析するアシスタントです。添付された1枚以上の画像は、アルバイト先のシフト表の写真またはスクリーンショットです。

# あなたのタスク
1. 画像内のシフト表の構造（誰の行が誰のシフトか）を理解する。
2. ユーザー本人の名前「${input.shiftName}」に該当する行を表内から探す。完全一致だけでなく、表記ゆれ・姓のみ・名前の一部のみの記載も候補として考慮する。
3. 該当行が1つに絞り込める場合のみ userMatch.status を "matched" とし、その行のシフトだけを shifts に抽出する。
4. 複数の行が候補になり得て確信を持って1つに絞れない場合は userMatch.status を "ambiguous" にし、shifts は空配列のままにして candidates に候補を列挙する。
5. 該当しそうな行が見つからない場合は userMatch.status を "not_found" にし、shifts は空配列にする。
6. 本人の行が曖昧なときに、絶対に自分で1つを勝手に決めつけない。

# シフト種別の扱い
以下は過去にユーザーが登録・修正した「シフト種別 → 時間」の対応表です。表内の記載（例:「早番」）がこの対応表のいずれかと一致する場合、その時間を優先的な手がかりとして使ってよい。ただし画像内に明記された時間があればそちらを優先する。
${knownShiftTypesText}

# 各シフトの抽出ルール
- date は "YYYY-MM-DD" 形式（西暦4桁）。年が画像から読み取れない場合は、直近の妥当な年を推定する。
- startTime / endTime は "HH:mm" 形式（24時間表記）。
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
 * Phase 1: sends the shift table image(s) straight to the Gemini API from the
 * client (PoC — see README "8. 不明点・リスク" 1 for the API-key-exposure risk
 * accepted for this phase) and parses its JSON response into a ShiftAnalysisResult.
 */
export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';

  constructor(
    private readonly apiKey: string = env.ai.geminiApiKey,
    private readonly model: string = env.ai.geminiModel,
  ) {}

  async analyzeShiftImages(input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult> {
    if (!this.apiKey) {
      throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to .env (see .env.example).');
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
      response = await fetch(`${GEMINI_API_BASE}/${this.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
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

    if (input.images.length === 1) {
      parsed.sourceImage = input.images[0].uri;
    }

    return parsed;
  }
}
