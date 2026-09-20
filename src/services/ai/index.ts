import { env } from '@/config/env';

import { GeminiProvider } from './geminiProvider';
import type { AIProvider } from './types';

export * from './types';

let cachedProvider: AIProvider | undefined;

/** Picks the active AIProvider from config, so call sites never branch on provider id. */
export function getAiProvider(): AIProvider {
  if (!cachedProvider) {
    switch (env.ai.provider) {
      case 'gemini':
      default:
        cachedProvider = new GeminiProvider();
    }
  }
  return cachedProvider;
}
