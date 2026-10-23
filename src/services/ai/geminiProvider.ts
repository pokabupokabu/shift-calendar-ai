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
 * 🔴 Anthropic へ切り替えたあとの「戻し用」に残している（EXPO_PUBLIC_AI_PROVIDER=gemini のときだけ使う）。
 * 実機で Anthropic の解析が通ることを確かめたら、リリース前にこのファイルごと消す
 * （docs/ai-model-comparison-2026-10.md「実装の進め方」）。
 */

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
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
      throw new AnalysisNotPerformedError(
        'EXPO_PUBLIC_AI_PROXY_URL / EXPO_PUBLIC_AI_PROXY_SECRET is not set. Add it to .env (see .env.example).',
      );
    }
    if (input.images.length === 0) {
      throw new AnalysisNotPerformedError('解析する画像がありません。');
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildShiftAnalysisPrompt(input) },
            ...input.images.map((image) => ({
              inlineData: { mimeType: image.mimeType, data: image.base64 },
            })),
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SHIFT_ANALYSIS_RESPONSE_SCHEMA,
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
      throw new AnalysisNotPerformedError(
        'AIサーバーへの通信に失敗しました。通信環境を確認してもう一度お試しください。',
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => undefined);
      const message =
        isPlainObject(errorBody) && isPlainObject(errorBody.error)
          ? String(errorBody.error.message ?? response.statusText)
          : response.statusText;
      throw new AnalysisNotPerformedError(`AI解析に失敗しました（${response.status}）: ${message}`);
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

    return parseShiftAnalysisText(text, input);
  }
}
