import { env } from '@/config/env';

import { AnthropicProvider } from './anthropicProvider';
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
 * Returns the AIProvider for the given tier, so call sites never know which model is behind it.
 * モデルの選択はここに閉じ込め、呼び出し側は段階（tier）だけを渡す。
 */
export function getAiProvider({ tier }: AiProviderOptions): AIProvider {
  const cached = cachedProviders[tier];
  if (cached) return cached;

  const provider = new AnthropicProvider(
    tier === 'advanced' ? env.ai.modelAdvanced : env.ai.modelStandard,
  );
  cachedProviders[tier] = provider;
  return provider;
}
