import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseFields } from '@/utils/legalBlocks';

import { legalTextStyles } from './legal-text';

/**
 * 特定商取引法に基づく表記（docs/ui-review/group-d.md「D3 決定事項」5、1回目を見ての決定3）。
 * 「項目: 内容」の行を白いカード1枚の一覧にし、項目名は灰色の13pt、内容は黒の15ptで下に出す。
 * 連絡先のメールアドレスもほかの項目と同じ黒い字だけ（リンクにもコピーにもしない）。
 */
export function LegalFields({ body }: { body: string }) {
  const theme = useTheme();
  const rows = useMemo(() => parseFields(body), [body]);

  return (
    <Card style={styles.card}>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          <View style={styles.row}>
            {row.label !== null && (
              <ThemedText type="footnote" themeColor="textSecondary">
                {row.label}
              </ThemedText>
            )}
            <ThemedText type="subheadline" style={legalTextStyles.body}>
              {row.value}
            </ThemedText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  row: {
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
});
