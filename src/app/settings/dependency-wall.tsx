import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ageBracketForYear } from '@/constants/dependencyWalls';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

const AGE_OPTIONS = [
  { value: true, label: '19〜22歳' },
  { value: false, label: 'それ以外' },
] as const;

const NOTES = [
  '社会保険の扶養の基準が変わります。年が変わったら選び直してください。',
  '週20時間以上・従業員51人以上の勤務先では、年収に関わらず自分の社会保険に加入することがあります（昼間部の学生は対象外）。',
  '住民税の壁は含めていません。金額は目安です。',
] as const;

/**
 * 扶養の壁の画面（docs/ui-review/group-d.md の決定10・7・8、D1の確定）。
 * 旧「アカウント設定」にあったアラートのオン・オフと年齢をここへ移した（学生区分は聞くのをやめた）。
 * 題名は上のバーだけに出し、画面の中に大見出しは置かない（決定1）。
 * 年齢区分は無料の人も設定できる。アラート（給与タブのカード）自体はPRO向け。
 */
export default function DependencyWallScreen() {
  const theme = useTheme();
  const dependencyAlertEnabled = useAppStore(
    (state) => state.user?.settings.dependencyAlertEnabled ?? true,
  );
  const ageBracket = useAppStore((state) => state.user?.settings.ageBracket);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const currentYear = new Date().getFullYear();
  // 去年の答えは選んでいない状態として見せる（年が変わったら選び直してもらう。決定7）
  const isAge19to22 = ageBracketForYear(ageBracket, currentYear);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <ThemedText type="subheadline" themeColor="textSecondary">
            年収が「壁」と呼ばれる金額を超えると、親の扶養から外れたり、税金がかかったりします。給与タブで、今年の年収見込みと壁までの残りを表示します。
          </ThemedText>
        </Card>

        <Card style={styles.switchRow}>
          <View style={styles.switchLabelGroup}>
            <View style={styles.switchTitleRow}>
              <ThemedText type="headline" style={styles.switchTitle}>
                扶養の壁アラート
              </ThemedText>
              {/* マイカスタムタブの「追加」の札と同じ金の「PRO」 */}
              <View style={[styles.proTag, { backgroundColor: theme.gold }]}>
                <ThemedText type="caption2" style={[styles.proTagLabel, { color: theme.onGold }]}>
                  PRO
                </ThemedText>
              </View>
            </View>
            <ThemedText type="footnote" themeColor="textSecondary">
              給与タブに年収見込みと壁までの残りを表示
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="扶養の壁アラート"
            value={dependencyAlertEnabled}
            onValueChange={(value) => updateSettings({ dependencyAlertEnabled: value })}
          />
        </Card>

        <View style={styles.group}>
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.caption}>
            年齢（{currentYear}年12月31日時点）
          </ThemedText>
          <SegmentedControl
            accessibilityLabel={`年齢（${currentYear}年12月31日時点）`}
            options={AGE_OPTIONS}
            value={isAge19to22}
            onChange={(value) =>
              updateSettings({ ageBracket: { year: currentYear, isAge19to22: value } })
            }
          />
        </View>

        <View style={styles.notes}>
          {NOTES.map((note) => (
            <View key={note} style={styles.noteRow}>
              <ThemedText type="footnote" themeColor="textSecondary">
                ・
              </ThemedText>
              <ThemedText type="footnote" themeColor="textSecondary" style={styles.noteText}>
                {note}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchLabelGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  switchTitle: {
    flexShrink: 1,
  },
  proTag: {
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  proTagLabel: {
    fontWeight: '700',
  },
  group: {
    gap: 6,
  },
  caption: {
    paddingHorizontal: Spacing.one,
  },
  notes: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  noteRow: {
    flexDirection: 'row',
  },
  noteText: {
    flex: 1,
  },
});
