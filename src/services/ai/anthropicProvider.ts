import { env } from '@/config/env';
import type { ShiftAnalysisResult } from '@/models';

import {
  buildShiftAnalysisPrompt,
  isPlainObject,
  parseShiftAnalysisText,
  SHIFT_ANALYSIS_RESPONSE_SCHEMA,
} from './prompt';
import { AnalysisNotPerformedError, type AIProvider, type AnalyzeShiftImagesInput } from './types';

/**
 * 応答の上限（出力トークン数）。考える過程（thinking）もここに含まれる。
 * 測定では24件の表で約6,300トークンだった。45件ほどの表でも足りるよう余裕を持たせる
 * （上限に届いた場合は stop_reason が "max_tokens" になり、途中で切れたJSONは使わない）。
 */
const MAX_OUTPUT_TOKENS = 16000;

/**
 * Anthropic の構造化出力は、すべてのオブジェクトに additionalProperties: false と
 * 全項目の required を求める。共通の応答の形（SHIFT_ANALYSIS_RESPONSE_SCHEMA）は変えずに、
 * 送る直前にこの決まりだけを足したコピーを作る。
 */
function toStrictJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toStrictJsonSchema);
  if (!isPlainObject(schema)) return schema;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = toStrictJsonSchema(value);
  }
  if (schema.type === 'object') {
    result.additionalProperties = false;
    result.required = Object.keys(isPlainObject(schema.properties) ? schema.properties : {});
  }
  return result;
}

const STRICT_RESPONSE_SCHEMA = toStrictJsonSchema(SHIFT_ANALYSIS_RESPONSE_SCHEMA);

interface AnthropicMessagesResponse {
  content?: { type?: string; text?: string }[];
  stop_reason?: string | null;
}

/**
 * Anthropic の画像ブロックが受け付ける形式。写真は resizeShiftImage で JPEG に揃えているが、
 * 万一それ以外が来たときに API が 400 で弾く前に、ここで分かる形にしておく。
 */
const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * シフト表の画像を、中継サーバー（server/ai-proxy の Cloudflare Worker）経由で
 * Anthropic の Claude に読ませる。本物の Anthropic APIキーは Worker のシークレットにだけあり、
 * このアプリには入らない（README「8. 不明点・リスク」1）。アプリが持つのは中継先のURLと合言葉だけ。
 */
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';

  constructor(
    private readonly model: string,
    private readonly proxyUrl: string = env.ai.proxyUrl,
    private readonly proxySecret: string = env.ai.proxySecret,
  ) {}

  async analyzeShiftImages(input: AnalyzeShiftImagesInput): Promise<ShiftAnalysisResult> {
    if (!this.proxyUrl || !this.proxySecret) {
      throw new AnalysisNotPerformedError(
        'EXPO_PUBLIC_AI_PROXY_URL / EXPO_PUBLIC_AI_PROXY_SECRET is not set. Add it to .env (see .env.example).',
      );
    }
    if (input.images.length === 0) {
      throw new AnalysisNotPerformedError('解析する画像がありません。');
    }
    const unsupported = input.images.find((image) => !SUPPORTED_MEDIA_TYPES.has(image.mimeType));
    if (unsupported) {
      throw new AnalysisNotPerformedError(
        `この形式の画像は読み取れません（${unsupported.mimeType}）。JPEGかPNGの画像を選んでください。`,
      );
    }

    // 画像を先に、指示文を後に置く（Anthropic が推奨する順番）。
    // 温度などの調整値は送らない（Haiku 5.5 は既定以外の値を 400 で弾くため）。
    const requestBody = {
      model: this.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            ...input.images.map((image) => ({
              type: 'image',
              source: { type: 'base64', media_type: image.mimeType, data: image.base64 },
            })),
            { type: 'text', text: buildShiftAnalysisPrompt(input) },
          ],
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: STRICT_RESPONSE_SCHEMA },
      },
    };

    let response: Response;
    try {
      response = await fetch(`${this.proxyUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-secret': this.proxySecret,
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new AnalysisNotPerformedError(
        'AIサーバーへの通信に失敗しました。通信環境を確認してもう一度お試しください。',
      );
    }

    // 中継サーバーやAIが受け付けなかった（合言葉違い・混雑・上限超え・障害など）場合は、
    // 解析そのものが行われていないので回数を消費させない（GeminiProvider と同じ扱い）。
    // 画面には番号や英語の本文を出さず、分かる日本語だけを出す（docs/ui-review/group-b.md の決定12）。
    // 原因を調べられるよう、番号と本文は開発用のログにだけ残す。
    if (!response.ok) {
      const errorBody = await response.json().catch(() => undefined);
      const message =
        isPlainObject(errorBody) && isPlainObject(errorBody.error)
          ? String(errorBody.error.message ?? response.statusText)
          : response.statusText;
      if (__DEV__)
        console.warn(`[AnthropicProvider] proxy returned ${response.status}: ${message}`);
      throw new AnalysisNotPerformedError(
        response.status === 429
          ? '短い時間に続けて送られたため、一時的に止めています。少し時間をおいてお試しください。'
          : 'AIのサービスが混み合っているか、一時的に使えません。少し時間をおいてお試しください。',
      );
    }

    const data = (await response.json()) as AnthropicMessagesResponse;

    // ここから先は、AIが応答したうえで読み取れなかった場合（回数は消費する）。
    if (data.stop_reason === 'refusal') {
      throw new Error('画像の内容によりAIが解析を拒否しました。');
    }
    if (data.stop_reason === 'max_tokens') {
      throw new Error(
        'シフトの量が多すぎて、AIが最後まで読み取れませんでした。表を分けて撮影してお試しください。',
      );
    }

    const text = (data.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
    if (!text) {
      throw new Error('AIから解析結果を取得できませんでした。');
    }

    return parseShiftAnalysisText(text, input);
  }
}
