import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

export interface PickerChipProps {
  /** 読み上げ用の名前（例「開始時刻」「日付」）。画面には出さない。 */
  accessibilityName: string;
  /** 表示する値（例「09:00」「10月16日（金）」）。空なら `placeholder` を灰色で出す。 */
  value: string;
  /** 下に回す選択の部品が開いているか（開いている札は青く塗る）。 */
  active: boolean;
  onPress: () => void;
  placeholder?: string;
  /** 閉じているときの文字の色。日付の札は青（押せると分かるように）、時刻の札は黒。 */
  valueColor?: 'text' | 'primary';
}

/**
 * 「勤務時間　[09:00] 〜 [17:00]」「日付　[10月16日（金）]」の札。
 * 押すと、その下に回して選ぶ部品（`TimePickerPanel` / `DatePickerPanel`）を開く。
 * 内容の確認の「日付を追加」の小窓と、シフトの編集の画面で共通（グループB2の決定7・12）。
 */
export function PickerChip({
  accessibilityName,
  value,
  active,
  onPress,
  placeholder = '--:--',
  valueColor = 'text',
}: PickerChipProps) {
  const theme = useTheme();
  const textColor = active
    ? theme.onPrimary
    : value
      ? valueColor === 'primary'
        ? theme.primary
        : theme.text
      : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityName} ${value || placeholder}`}
      accessibilityState={{ expanded: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.primary : theme.fill,
          borderColor: active ? theme.primary : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <ThemedText type="subheadline" style={[styles.label, { color: textColor }]}>
        {value || placeholder}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TAP_HEIGHT,
    paddingHorizontal: Spacing.three - Spacing.one,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
