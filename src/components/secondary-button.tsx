import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 横並びにするときの幅（flex）や高さの調整に使う。 */
  style?: StyleProp<ViewStyle>;
}

/**
 * 副ボタン（docs/design-system.md 6章）: 主ボタンと同じピル型で、白地（`backgroundElement`）＋
 * 1pxの枠（`border`）＋青い文字（`primary`）。「閉じる」「キャンセル」など、主な操作と並ぶもう1つの選択肢に使う。
 * 既定では横いっぱい。高さは最低44pt（指で押しやすい最小の大きさ）。
 */
export function SecondaryButton({ label, onPress, disabled, style }: SecondaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <ThemedText type="headline" themeColor="primary" numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
