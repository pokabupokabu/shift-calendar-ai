import { router } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { useTheme } from '@/hooks/use-theme';
import { computeDailyEarnings, computeMonthlyPayroll } from '@/utils/computePayroll';
import { formatShiftDate } from '@/utils/formatShift';
import { useAppStore } from '@/store/useAppStore';

/** 給与計算タブ: 月ごとにシフト種別別の時給集計と合計見込み額を表示する。 */
export default function PayrollTab() {
  const theme = useTheme();
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();

  const payroll = useMemo(
    () => computeMonthlyPayroll(calendarEvents, shiftTypes, month),
    [calendarEvents, shiftTypes, month],
  );

  const dailyEarnings = useMemo(
    () => computeDailyEarnings(calendarEvents, shiftTypes, month),
    [calendarEvents, shiftTypes, month],
  );

  const hasUnsetWage =
    payroll.unclassifiedCount > 0 ||
    shiftTypes.some((shiftType) => shiftType.hourlyWage === undefined);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} hitSlop={Spacing.two}>
          <ChevronLeft size={IconSize.medium} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">{label}</ThemedText>
        <Pressable onPress={goToNextMonth} hitSlop={Spacing.two}>
          <ChevronRight size={IconSize.medium} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {payroll.byShiftType.map((entry) => (
          <Card key={entry.name} style={styles.row}>
            <Wallet size={IconSize.medium} color={theme.textSecondary} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{entry.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {entry.hours}時間 × 時給{entry.hourlyWage.toLocaleString('ja-JP')}円
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              ¥{Math.round(entry.subtotal).toLocaleString('ja-JP')}
            </ThemedText>
          </Card>
        ))}

        <Card style={styles.row}>
          <Coins size={IconSize.medium} color={theme.primary} />
          <View style={styles.rowText}>
            <ThemedText type="default">今月の合計見込み</ThemedText>
          </View>
          <ThemedText type="subtitle" themeColor="primary">
            ¥{Math.round(payroll.total).toLocaleString('ja-JP')}
          </ThemedText>
        </Card>

        <ThemedText type="smallBold" style={styles.sectionHeading}>
          日別履歴
        </ThemedText>

        {dailyEarnings.length === 0 ? (
          <Card style={styles.row}>
            <ThemedText type="small" themeColor="textSecondary">
              この月のシフトはまだありません
            </ThemedText>
          </Card>
        ) : (
          dailyEarnings.map((entry, index) => (
            <Card key={`${entry.date}-${index}`} style={styles.row}>
              <CalendarDays size={IconSize.medium} color={theme.textSecondary} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold">{formatShiftDate(entry.date)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.shiftType ? `${entry.shiftType}・` : ''}
                  {entry.hours}時間
                </ThemedText>
              </View>
              <ThemedText type="smallBold">
                ¥{Math.round(entry.earnings).toLocaleString('ja-JP')}
              </ThemedText>
            </Card>
          ))
        )}

        {hasUnsetWage && (
          <Card style={styles.row} onPress={() => router.push('/settings/shift-types')}>
            <TriangleAlert size={IconSize.medium} color={theme.danger} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">時給が未設定のシフトがあります</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                シフト種別に時給を設定すると、全てのシフトを集計に含められます
              </ThemedText>
            </View>
          </Card>
        )}

        <AdPlaceholder slot="payroll" style={styles.ad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  scrollContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  sectionHeading: {
    marginTop: Spacing.two,
  },
  ad: {
    marginTop: Spacing.two,
  },
});
