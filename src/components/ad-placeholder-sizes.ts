/** Shared dimensions between ad-placeholder.tsx (web) and ad-placeholder.native.tsx. */
export const AD_PLACEHOLDER_DIMENSIONS = {
  banner: { height: 56 },
  rectangle: { height: 250 },
  inline: { height: 40, width: 120 },
} as const;

export type AdPlaceholderSize = keyof typeof AD_PLACEHOLDER_DIMENSIONS;
