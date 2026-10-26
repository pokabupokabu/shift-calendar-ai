import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

export interface TimeFieldButtonProps {
  /** 欄の上の小さなラベル（例「開始時刻」）。 */
  label: string;
  /** "HH:mm"。空なら `placeholder` を灰色で出す。 */
  value: string;
  /** 回す時刻選択がこの欄に開いているか（青い枠になる）。 */
  active: boolean;
  onPress: () => void;
  /** 値が空のときの表示。既定は「--:--」（マイカスタムの基本種別では「未登録」）。 */
  placeholder?: string;
  /**
   * 欄の地の色。既定の `fill`（一段沈んだ欄のベージュ）は白いカードの上に置くとき（②のカレンダー）。
   * クリームの地の小窓に直接置くとき（④のマイカスタム）は `backgroundElement`（白）。
   */
  surface?: 'fill' | 'backgroundElement';
}

/**
 * 時刻の欄（押すと下に回す時刻選択 `TimePickerPanel` を開く）。
 * カレンダーの小窓（②）とマイカスタムの小窓（④）で共通。
 */
export function TimeFieldButton({
  label,
  value,
  active,
  onPress,
  placeholder = '--:--',
  surface = 'fill',
}: TimeFieldButtonProps) {
  const theme = useTheme();
  return (
    <View style={styles.timeField}>
      <ThemedText type="footnote" themeColor={active ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value || placeholder}`}
        accessibilityState={{ expanded: active }}
        onPress={onPress}
        style={[
          styles.timeFieldBox,
          {
            backgroundColor: theme[surface],
            borderColor: active ? theme.primary : theme.border,
          },
        ]}
      >
        <ThemedText
          type="title3"
          themeColor={active ? 'primary' : value ? 'text' : 'textSecondary'}
        >
          {value || placeholder}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  timeField: {
    flex: 1,
    gap: Spacing.one,
  },
  timeFieldBox: {
    minHeight: MIN_TAP_HEIGHT,
    paddingVertical: Spacing.two,
    borderRadius: Radius.smallLarge,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
