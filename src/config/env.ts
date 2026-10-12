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
    // 無料とPROでモデルを出し分ける。実シフト表6枚での実測にもとづく既定値で、
    // 無料は速度とコスト、PROは難解な表での正直さ（読めない時に警告を返すか）を優先している。
    // Gemini のモデル名は頻繁に変わるため、コード変更なしで差し替えられるようにしておく。
    geminiModelFree: process.env.EXPO_PUBLIC_GEMINI_MODEL_FREE ?? 'gemini-3.5-flash-lite',
    geminiModelPro: process.env.EXPO_PUBLIC_GEMINI_MODEL_PRO ?? 'gemini-3.8-flash',
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
  revenueCat: {
    // Public API key (not a secret — safe to embed, same as any App Store client key).
    iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
  },
} as const;
