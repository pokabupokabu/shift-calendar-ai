/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    // Apple HIG "systemGroupedBackground": the page sits on a soft gray, cards sit on white.
    background: '#F2F2F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5EA',
    textSecondary: '#8E8E93',
    // Semantic tokens matching Apple's iOS system colors (see Stitch mockups).
    primary: '#007AFF',
    onPrimary: '#FFFFFF',
    accent: '#007AFF',
    success: '#34C759',
    danger: '#FF3B30',
    orange: '#FF9500',
    purple: '#5E35B1',
    border: '#E5E5EA',
    disabled: '#C7C7CC',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    textSecondary: '#98989F',
    primary: '#0A84FF',
    onPrimary: '#FFFFFF',
    accent: '#0A84FF',
    success: '#30D158',
    danger: '#FF453A',
    orange: '#FF9F0A',
    purple: '#9061F9',
    border: '#38383A',
    disabled: '#5C5C5E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Soft-tinted circular icon backgrounds (Stitchモックアップのアイコンバッジ表現に合わせた共通トークン)。
 * `IconBadge`コンポーネント経由で使う想定で、色を画面ごとに決め打ちしない。 */
export const IconBadgeTones = {
  light: {
    blue: { background: '#E8F2FF', icon: '#007AFF' },
    green: { background: '#EAF8EE', icon: '#34C759' },
    orange: { background: '#FFF3E6', icon: '#FF9500' },
    purple: { background: '#EDE7F6', icon: '#5E35B1' },
    red: { background: '#FDE8E8', icon: '#FF3B30' },
    neutral: { background: '#F2F2F7', icon: '#8E8E93' },
  },
  dark: {
    blue: { background: '#173049', icon: '#0A84FF' },
    green: { background: '#173625', icon: '#30D158' },
    orange: { background: '#3A2A14', icon: '#FF9F0A' },
    purple: { background: '#2C2140', icon: '#9061F9' },
    red: { background: '#3A1D1D', icon: '#FF453A' },
    neutral: { background: '#1C1C1E', icon: '#98989F' },
  },
} as const;

export type IconBadgeTone = keyof typeof IconBadgeTones.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Font-size/line-height/weight metrics for each ThemedText `type`, extracted from
 * the values themed-text.tsx already used inline, so existing screens render unchanged. */
export const Typography = {
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  title: { fontSize: 48, lineHeight: 52, fontWeight: '600' },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: '600' },
  link: { fontSize: 14, lineHeight: 30, fontWeight: '500' },
  linkPrimary: { fontSize: 14, lineHeight: 30, fontWeight: '500' },
  code: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: (Platform.select({ android: '700' }) ?? '500') as '700' | '500',
  },
  // Apple iOS text styles (see Stitch mockups) — additive, for screens being restyled
  // to match those mockups precisely. Existing keys above are left untouched.
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.23 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.06 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.26 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45 },
  largeTitleMobile: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: 0.35 },
} as const;

export const Radius = {
  small: 8,
  // Tailwind's rounded-xl (0.75rem), used a lot for inset rows/buttons in the Stitch mockups.
  smallLarge: 12,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const IconSize = {
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 48,
} as const;
