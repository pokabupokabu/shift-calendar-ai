import { env } from '@/config/env';

import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from './types';

export * from './types';

/** 無料ユーザーとPROユーザーで別のモデルを使うため、プラン単位でキャッシュする。 */
type PlanKey = 'free' | 'pro';

const cachedProviders: Partial<Record<PlanKey, AIProvider>> = {};

export interface AiProviderOptions {
  /** PROかどうか。精度の高い（そのぶん高価な）モデルを使うかの判断にのみ使う。 */
  isPro: boolean;
}

/**
 * Picks the active AIProvider from config, so call sites never branch on provider id.
 * モデルの選択はここに閉じ込め、呼び出し側はプランだけを渡す。
 */
export function getAiProvider({ isPro }: AiProviderOptions): AIProvider {
  const plan: PlanKey = isPro ? 'pro' : 'free';
  const cached = cachedProviders[plan];
  if (cached) return cached;

  const model = isPro ? env.ai.geminiModelPro : env.ai.geminiModelFree;
  let provider: AIProvider;
  switch (env.ai.provider) {
    case 'gemini':
    default:
      provider = new GeminiProvider(model);
  }
  cachedProviders[plan] = provider;
  return provider;
}
