import { Pressable, StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * 主ボタン。docs/design-system.md 6章のとおり、青・ピル型・横いっぱい・白文字の1種類だけ
 * （2026-10-27 に昔の黒・角丸16の作りと `variant` の指定をなくした）。
 */
export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  const theme = useTheme();

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
});
