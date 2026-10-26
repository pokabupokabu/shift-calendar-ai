import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { usePaywallColors } from '@/hooks/use-paywall-colors';

const TAIL_SIZE = 10;

/**
 * 上部のはこブーの吹き出し。白い地（ダークは暗い地に金の縁）。
 * しっぽは `tail` の向き（left／right＝その側にいるはこブーへ、bottom＝下へ）に出す。
 * `large` は上部の空きを埋める大きめの吹き出し（文字16pt。2026-10-27 ユーザーの要望）。
 * 台詞は言葉の途中で折り返さないよう、呼び出し側で `\n` を入れて渡す。
 */
export function SpeechBubble({
  text,
  tail,
  large = false,
  style,
}: {
  text: string;
  tail: 'left' | 'right' | 'bottom';
  large?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = usePaywallColors();
  const isDark = useResolvedColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.bubble,
        large && styles.bubbleLarge,
        { backgroundColor: colors.bubbleBackground, borderColor: colors.bubbleBorder },
        !isDark && styles.shadow,
        style,
      ]}
    >
      <Text style={[styles.text, large && styles.textLarge, { color: colors.bubbleText }]}>
        {text}
      </Text>
      {/* 正方形を45度回し、2辺だけ縁を付けてしっぽにする（縁のある吹き出しでも継ぎ目が出ない） */}
      <View
        style={[
          styles.tail,
          TAIL_STYLES[tail],
          {
            backgroundColor: colors.bubbleBackground,
            borderColor: colors.bubbleBorder,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bubbleLarge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textLarge: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  tail: {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    transform: [{ rotate: '45deg' }],
  },
  // 左下の角が左を向く
  tailLeft: {
    left: -TAIL_SIZE / 2 - 0.5,
    bottom: 18,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  // 右上の角が右を向く
  tailRight: {
    right: -TAIL_SIZE / 2 - 0.5,
    bottom: 18,
    borderRightWidth: 1,
    borderTopWidth: 1,
  },
  // 右下の角が下を向く
  tailBottom: {
    bottom: -TAIL_SIZE / 2 - 0.5,
    right: 40,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
});

const TAIL_STYLES = {
  left: styles.tailLeft,
  right: styles.tailRight,
  bottom: styles.tailBottom,
} as const;
