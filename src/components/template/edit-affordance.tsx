import { Pencil } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 値をその場で直す行（基本時給・休憩・割増）の右に置く、青い「✎ 編集」。
 * 行全体を押すと編集の小窓が開く行（シフト種別）は「編集 ›」を使う（サブグループ④の決定11）。
 * 押せる範囲は行の側（`Pressable`）が持つ。
 */
export function EditAffordance() {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Pencil size={IconSize.small} color={theme.primary} />
      <ThemedText type="footnote" themeColor="primary" style={styles.label}>
        編集
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 0,
  },
  label: {
    fontWeight: '600',
  },
});
