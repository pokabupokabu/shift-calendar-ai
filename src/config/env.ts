/**
 * Single source of truth for env-derived config.
 * EXPO_PUBLIC_* values are inlined into the JS bundle at build time by Expo/Metro,
 * so nothing read here may be a secret with write access or per-call cost once
 * this ships beyond an internal PoC (see README risk notes).
 */
export const env = {
  ai: {
    provider: process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'gemini',
    // Cloudflare Workers proxy in front of Gemini (server/gemini-proxy) — the
    // real Gemini API key lives only in that Worker's secrets, never here.
    proxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
    proxySecret: process.env.EXPO_PUBLIC_AI_PROXY_SECRET ?? '',
    // Gemini model names change frequently; keep it swappable without a code change.
    geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3-flash-preview',
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
} as const;
