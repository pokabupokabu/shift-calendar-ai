/**
 * Single source of truth for env-derived config.
 * EXPO_PUBLIC_* values are inlined into the JS bundle at build time by Expo/Metro,
 * so nothing read here may be a secret with write access or per-call cost once
 * this ships beyond an internal PoC (see README risk notes).
 */
export const env = {
  ai: {
    provider: process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'gemini',
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
} as const;
