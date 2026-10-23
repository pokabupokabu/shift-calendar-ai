/**
 * Single source of truth for env-derived config.
 * EXPO_PUBLIC_* values are inlined into the JS bundle at build time by Expo/Metro,
 * so nothing read here may be a secret with write access or per-call cost once
 * this ships beyond an internal PoC (see README risk notes).
 */
export const env = {
  ai: {
    // 'anthropic'（既定）か 'gemini'。Gemini は実機で Anthropic が動くのを確かめるまでの戻し用で、
    // リリース前にコードごと消す（docs/ai-model-comparison-2026-10.md「実装の進め方」）。
    provider: process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'anthropic',
    // 中継サーバー（server/gemini-proxy の Cloudflare Worker）。本物の Anthropic / Gemini の
    // APIキーはその Worker のシークレットにだけあり、ここ（アプリ）には入らない。
    proxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
    proxySecret: process.env.EXPO_PUBLIC_AI_PROXY_SECRET ?? '',
    // ふだんの解析（無料・PRO共通）と「高度なスキャン」（PROだけ・回数は別枠）で使うモデル。
    // 実シフト表での測定にもとづく既定値（docs/ai-model-comparison-2026-10.md）。
    // ここを変えるときは server/gemini-proxy の ANTHROPIC_ALLOWED_MODELS も必ず一緒に直す（片方だけだと404）。
    modelStandard: process.env.EXPO_PUBLIC_AI_MODEL_STANDARD ?? 'claude-haiku-5-5',
    modelAdvanced: process.env.EXPO_PUBLIC_AI_MODEL_ADVANCED ?? 'claude-sonnet-5-5',
    // provider が 'gemini' のときだけ使う（ふだん→_FREE、高度なスキャン→_PRO）。
    // 3.1-flash-lite と 3.5-flash-lite は名前が似ているが別物で、3.5 は精度が悪い。バージョン番号まで書くこと。
    // ここを変えるときは server/gemini-proxy の ALLOWED_MODELS も必ず一緒に直す（片方だけだと404）。
    geminiModelFree: process.env.EXPO_PUBLIC_GEMINI_MODEL_FREE ?? 'gemini-3.1-flash-lite',
    geminiModelPro: process.env.EXPO_PUBLIC_GEMINI_MODEL_PRO ?? 'gemini-3.8-flash',
  },
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
  /**
   * 開発用のプロモーションコード（DEVPRO / DEVFREE）を出すかどうか。
   * これが有効だと誰でも無料でPROになれるため、**App Store提出用のビルドでは必ず未設定にする**。
   * 変数が無ければ自動的に無効になるので、消し忘れても出荷物には入らない。
   */
  enableDevPromoCode: process.env.EXPO_PUBLIC_ENABLE_DEV_PROMO === 'true',
  revenueCat: {
    // Public API key (not a secret — safe to embed, same as any App Store client key).
    iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
  },
} as const;
