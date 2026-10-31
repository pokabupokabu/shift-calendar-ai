/**
 * Single source of truth for env-derived config.
 * EXPO_PUBLIC_* values are inlined into the JS bundle at build time by Expo/Metro,
 * so nothing read here may be a secret with write access or per-call cost once
 * this ships beyond an internal PoC (see README risk notes).
 */
export const env = {
  ai: {
    // 中継サーバー（server/ai-proxy の Cloudflare Worker）。本物の Anthropic の
    // APIキーはその Worker のシークレットにだけあり、ここ（アプリ）には入らない。
    proxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
    proxySecret: process.env.EXPO_PUBLIC_AI_PROXY_SECRET ?? '',
    // ふだんの解析（無料・PRO共通）と「高度なスキャン」（PROだけ・回数は別枠）で使うモデル。
    // 実シフト表での測定にもとづく既定値（docs/ai-model-comparison-2026-10.md）。
    // ここを変えるときは server/ai-proxy の ANTHROPIC_ALLOWED_MODELS も必ず一緒に直す（片方だけだと404）。
    modelStandard: process.env.EXPO_PUBLIC_AI_MODEL_STANDARD ?? 'claude-haiku-5-5',
    modelAdvanced: process.env.EXPO_PUBLIC_AI_MODEL_ADVANCED ?? 'claude-sonnet-5-5',
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
