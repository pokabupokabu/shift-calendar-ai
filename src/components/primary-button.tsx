import { Pressable, StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * 見た目。既定の `legacy` は今までどおりの黒・角丸16。
   * `bluePill` は docs/design-system.md 6章の新しい主ボタン（青・ピル型・横いっぱい・白文字）。
   * 全画面の見直しが終わったら既定値を `bluePill` に変え、このプロパティは消す予定
   * （それまでは既存の呼び出しの見た目を変えないため、使う画面ごとに明示する）。
   */
  variant?: 'legacy' | 'bluePill';
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'legacy',
}: PrimaryButtonProps) {
  const theme = useTheme();

  if (variant === 'bluePill') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.pillButton,
          { backgroundColor: theme.primary, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <ThemedText type="headline" numberOfLines={1} style={{ color: theme.onPrimary }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <ThemedText style={[styles.label, { color: theme.background }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 高さは48pt（Stitchの案どおり。指で押しやすい最小の44ptより少し大きい）。
  pillButton: {
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
