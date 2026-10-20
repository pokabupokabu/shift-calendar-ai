import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

/** マイカスタムの小窓の見出し（②③の小窓と同じ `title2`）。 */
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <ThemedText type="title2">{children}</ThemedText>;
}

/** 入力欄の上の小さなラベル。 */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="footnote" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

/** 小窓の中の文字の入力欄（灰色の小窓の地の上に白い欄・細い枠）。 */
export function DialogTextInput({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** 塗りのピル型ボタン（「追加」「保存」は青、「削除する」は赤）。②の小窓の「保存」「削除する」と同じ形。 */
export function FilledPillButton({
  label,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone: 'primary' | 'danger';
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.filledButton,
        {
          backgroundColor: theme[tone],
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <ThemedText type="headline" numberOfLines={1} style={{ color: theme.onPrimary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 小窓の下の、ボタンを横に並べる行。 */
export function DialogButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.buttonRow}>{children}</View>;
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TAP_HEIGHT,
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: Typography.body.fontSize,
  },
  filledButton: {
    flex: 1,
    minHeight: MIN_TAP_HEIGHT,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
