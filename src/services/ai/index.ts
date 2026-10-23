import { env } from '@/config/env';

import { AnthropicProvider } from './anthropicProvider';
import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from './types';

export * from './types';

/**
 * どの精度で読むか。
 * - standard: ふだんの解析（無料・PRO共通）
 * - advanced: 「高度なスキャン」（PROだけ。回数はふつうの解析とは別枠）
 *
 * 呼び出し側はこの段階だけを選び、どの会社のどのモデルかはここに閉じ込める。
 */
export type AiTier = 'standard' | 'advanced';

const cachedProviders: Partial<Record<AiTier, AIProvider>> = {};

export interface AiProviderOptions {
  tier: AiTier;
}

/**
 * Picks the active AIProvider from config, so call sites never branch on provider id.
 * モデルの選択はここに閉じ込め、呼び出し側は段階（tier）だけを渡す。
 */
export function getAiProvider({ tier }: AiProviderOptions): AIProvider {
  const cached = cachedProviders[tier];
  if (cached) return cached;

  let provider: AIProvider;
  switch (env.ai.provider) {
    case 'gemini':
      // 戻し用（リリース前に消す）。ふだん→無料用モデル、高度なスキャン→PRO用モデルに読み替える。
      provider = new GeminiProvider(
        tier === 'advanced' ? env.ai.geminiModelPro : env.ai.geminiModelFree,
      );
      break;
    case 'anthropic':
    default:
      provider = new AnthropicProvider(
        tier === 'advanced' ? env.ai.modelAdvanced : env.ai.modelStandard,
      );
  }
  cachedProviders[tier] = provider;
  return provider;
}
