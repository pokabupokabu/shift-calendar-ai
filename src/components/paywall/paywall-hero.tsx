import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { usePaywallColors } from '@/hooks/use-paywall-colors';

/** 4つの角のきらめき（Stitch の B の形）と、5つの角の星。どちらも 24×24 の枠で描く。 */
const SPARKLE_PATH = 'M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z';
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

interface Decoration {
  shape: 'sparkle' | 'star';
  size: number;
  opacity: number;
  position: Pick<ViewStyle, 'top' | 'left' | 'right' | 'bottom'>;
}

/** きらめきの置き方。ライトは白いきらめき（Stitch の B）、ダークは金のきらめきと星を控えめに（Stitch の D）。 */
const DECORATIONS: Record<'purchase' | 'thanks', Record<'light' | 'dark', Decoration[]>> = {
  purchase: {
    light: [
      { shape: 'sparkle', size: 14, opacity: 0.9, position: { top: 12, left: 40 } },
      { shape: 'sparkle', size: 10, opacity: 0.75, position: { top: 28, left: 128 } },
      { shape: 'sparkle', size: 13, opacity: 0.95, position: { top: 20, right: 96 } },
      { shape: 'sparkle', size: 9, opacity: 0.8, position: { bottom: 32, right: 48 } },
    ],
    dark: [
      { shape: 'sparkle', size: 12, opacity: 0.6, position: { top: 16, left: 24 } },
      { shape: 'star', size: 13, opacity: 0.45, position: { top: 40, left: 128 } },
      { shape: 'sparkle', size: 12, opacity: 0.7, position: { top: 20, right: 64 } },
      { shape: 'star', size: 11, opacity: 0.4, position: { top: 48, right: 112 } },
    ],
  },
  thanks: {
    light: [
      { shape: 'sparkle', size: 16, opacity: 0.85, position: { top: 16, left: 24 } },
      { shape: 'star', size: 12, opacity: 0.7, position: { top: 36, left: 112 } },
      { shape: 'sparkle', size: 12, opacity: 0.8, position: { top: 64, left: 32 } },
      { shape: 'sparkle', size: 18, opacity: 0.9, position: { top: 20, right: 32 } },
      { shape: 'star', size: 12, opacity: 0.7, position: { bottom: 16, left: 64 } },
      { shape: 'sparkle', size: 10, opacity: 0.8, position: { top: 48, right: 112 } },
    ],
    dark: [
      { shape: 'sparkle', size: 14, opacity: 0.6, position: { top: 16, left: 24 } },
      { shape: 'star', size: 12, opacity: 0.45, position: { top: 36, left: 112 } },
      { shape: 'sparkle', size: 14, opacity: 0.7, position: { top: 20, right: 32 } },
      { shape: 'star', size: 11, opacity: 0.4, position: { bottom: 16, left: 64 } },
    ],
  },
};

/** 押せる範囲は44pt、見た目の丸は30pt（Stitch の B）。 */
const CLOSE_HIT_SIZE = 44;
const CLOSE_CIRCLE_SIZE = 30;

/**
 * 課金画面とお礼の表示の上部。濃い金のグラデーション（ダークは暗い金茶）にきらめきを散らし、
 * 中身（はこブーと吹き出し）を下にそろえて置く。`onClose` を渡すと右上に半透明の丸い×を出す。
 */
export function PaywallHero({
  height,
  variant,
  onClose,
  children,
}: {
  height: number;
  variant: 'purchase' | 'thanks';
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const colors = usePaywallColors();
  const scheme = useResolvedColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View style={[styles.hero, { height }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* ライトは上から下へ（Stitch の B）、ダークは斜め（Stitch の D） */}
          <LinearGradient id="paywallHero" x1="0" y1="0" x2={isDark ? '1' : '0'} y2="1">
            <Stop offset="0" stopColor={colors.heroStart} />
            <Stop offset="1" stopColor={colors.heroEnd} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#paywallHero)" />
      </Svg>
      {DECORATIONS[variant][scheme].map((item, index) => (
        <Svg
          key={index}
          width={item.size}
          height={item.size}
          viewBox="0 0 24 24"
          pointerEvents="none"
          style={[styles.decoration, item.position, { opacity: item.opacity }]}
        >
          <Path d={item.shape === 'sparkle' ? SPARKLE_PATH : STAR_PATH} fill={colors.sparkle} />
        </Svg>
      ))}
      <View style={styles.content}>{children}</View>
      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="閉じる"
          onPress={onClose}
          style={({ pressed }) => [styles.closeHit, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={[styles.closeCircle, { backgroundColor: colors.closeBackground }]}>
            <X size={15} color={colors.closeIcon} strokeWidth={2.5} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  decoration: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  closeHit: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: CLOSE_HIT_SIZE,
    height: CLOSE_HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircle: {
    width: CLOSE_CIRCLE_SIZE,
    height: CLOSE_CIRCLE_SIZE,
    borderRadius: CLOSE_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
