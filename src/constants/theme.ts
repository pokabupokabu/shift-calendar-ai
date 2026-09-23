/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // Semantic tokens (DADS-inspired: a small, deliberate set of role-based
    // colors layered on top of the base palette, rather than per-screen ad-hoc colors).
    primary: '#208AEF',
    onPrimary: '#FFFFFF',
    accent: '#208AEF',
    success: '#1C8A4B',
    danger: '#D6373A',
    border: '#D9DBE0',
    disabled: '#C4C7CD',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#5AA9FF',
    onPrimary: '#FFFFFF',
    accent: '#5AA9FF',
    success: '#34C77B',
    danger: '#FF6B6B',
    border: '#3A3D42',
    disabled: '#5C6066',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
} as const;

export const Radius = {
  small: 8,
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
