import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Coins, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS } from '@/models';
import { computeDailyEarnings, computeMonthlyPayroll } from '@/utils/computePayroll';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';
import { useAppStore } from '@/store/useAppStore';

function formatYen(amount: number): string {
  return `${Math.round(amount).toLocaleString('ja-JP')}円`;
}

const WAGE_TYPE_LABEL = { hourly: '時給', daily: '日給' } as const;

/** 給与計算タブ: 月ごとにシフト種別別の集計と合計見込み額を表示する。 */
export default function PayrollTab() {
  const theme = useTheme();
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const settings = useAppStore((state) => state.user?.settings) ?? DEFAULT_USER_SETTINGS;
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();

  const payroll = useMemo(
    () =>
      computeMonthlyPayroll(
        calendarEvents,
        month,
        settings.wageType,
        settings.hourlyWage,
        settings.dailyWage,
      ),
    [calendarEvents, month, settings.wageType, settings.hourlyWage, settings.dailyWage],
  );

  const dailyEarnings = useMemo(
    () =>
      computeDailyEarnings(
        calendarEvents,
        month,
        settings.wageType,
        settings.hourlyWage,
        settings.dailyWage,
      ),
    [calendarEvents, month, settings.wageType, settings.hourlyWage, settings.dailyWage],
  );

  const monthLabel = format(month, 'M月', { locale: ja });

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} hitSlop={Spacing.two}>
          <ChevronLeft size={IconSize.medium} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.monthLabel}>
          {label}
        </ThemedText>
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
                {settings.wageType === 'daily'
                  ? `${entry.count}日 × ${WAGE_TYPE_LABEL.daily}${formatYen(settings.dailyWage)}`
                  : `${entry.hours}時間 × ${WAGE_TYPE_LABEL.hourly}${formatYen(settings.hourlyWage)}`}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatYen(entry.subtotal)}</ThemedText>
          </Card>
        ))}

        <Card style={styles.totalCard}>
          <View style={styles.row}>
            <Coins size={IconSize.medium} color={theme.primary} />
            <ThemedText type="default">{monthLabel}の合計見込み</ThemedText>
          </View>
          <ThemedText type="subtitle" themeColor="primary" style={styles.totalAmount}>
            {formatYen(payroll.total)}
          </ThemedText>
        </Card>

        <ThemedText type="smallBold" style={styles.sectionHeading}>
          出勤履歴
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
                  {formatShiftTimeRange(
                    entry.startTime,
                    entry.endTime,
                    entry.endTime <= entry.startTime,
                  )}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatYen(entry.earnings)}</ThemedText>
            </Card>
          ))
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
  monthLabel: {
    fontSize: 20,
    lineHeight: 26,
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
  totalCard: {
    gap: Spacing.one,
  },
  totalAmount: {
    alignSelf: 'flex-start',
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
