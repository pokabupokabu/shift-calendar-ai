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
    // 無料とPROでモデルを出し分ける。実シフト表での実測にもとづく既定値。
    // 無料の 3.1-flash-lite は、同じLite系でも世代が新しい 3.5-flash-lite とは結果が正反対で、
    // 実サンプルでは5回とも完答した（3.5 は的中9〜11/18・誤検出6〜8で、働いていない日まで拾う）。
    // Gemini のモデル名は頻繁に変わるため、コード変更なしで差し替えられるようにしておく。
    // ここを変えるときは server/gemini-proxy の ALLOWED_MODELS も必ず一緒に直す（片方だけだと404）。
    geminiModelFree: process.env.EXPO_PUBLIC_GEMINI_MODEL_FREE ?? 'gemini-3.1-flash-lite',
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
