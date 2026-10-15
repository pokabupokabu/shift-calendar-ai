import { Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  'マイカスタムで「Google カレンダー」と連携し、登録先にする',
  '使っているカレンダーアプリの設定で「Googleカレンダーと同期する」をオンにする',
  'シフトを登録すると、そのアプリにも表示される場合がある',
];

/**
 * Apple / Google 以外のカレンダーアプリで表示するための説明だけのページ。
 * 連携できるのは Apple と Google の2つだけで、その2つはマイカスタムに直接並べている。
 */
export default function OtherCalendarsScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <ThemedText type="subtitle">その他のカレンダーで見る</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        シフToカレが直接登録できるのは Apple カレンダーと Google
        カレンダーの2つです。Jorte・Lifebear・Fantastical
        など、ほかのカレンダーアプリで見たい場合は、Google
        カレンダーを経由すると表示できる場合があります。
      </ThemedText>

      <Card style={styles.group}>
        {STEPS.map((step, index) => (
          <View
            key={step}
            style={[styles.row, index > 0 && styles.rowBorder, { borderTopColor: theme.border }]}
          >
            <View style={[styles.stepNumber, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="caption1" style={styles.stepNumberText}>
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText style={styles.rowLabel}>{step}</ThemedText>
          </View>
        ))}
      </Card>

      <View style={styles.noteRow}>
        <Info size={IconSize.small} color={theme.textSecondary} />
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.noteLabel}>
          同期の方法や反映までの時間は、それぞれのカレンダーアプリによって異なります。
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  rowLabel: {
    flex: 1,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontWeight: '600',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  noteLabel: {
    flex: 1,
  },
});
