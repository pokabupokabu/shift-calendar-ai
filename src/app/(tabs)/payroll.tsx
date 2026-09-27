import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS } from '@/models';
import {
  computeDailyEarnings,
  computeMonthlyPayroll,
  type DailyEarning,
  type PayrollShiftTypeBreakdown,
} from '@/utils/computePayroll';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';
import { useAppStore } from '@/store/useAppStore';

function formatYen(amount: number): string {
  return `${Math.round(amount).toLocaleString('ja-JP')}円`;
}

function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100}`;
}

const WAGE_TYPE_LABEL = { hourly: '時給', daily: '日給' } as const;
const ALL_SHIFT_TYPES_FILTER = '__all__';
const HISTORY_PAGE_SIZE = 5;

/** シフト種別カードの色分け（2つ目以降を視覚的に区別するための循環パレット）。 */
const SERIES_COLOR_KEYS = ['primary', 'orange', 'purple'] as const;

/** 給与計算タブ: 月ごとの合計見込み・簡易明細一覧・シフト種別別の想定給与を表示する。 */
export default function PayrollTab() {
  const theme = useTheme();
  const badgeBlue = useIconBadgeColors('blue');
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const settings = useAppStore((state) => state.user?.settings) ?? DEFAULT_USER_SETTINGS;
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string>(ALL_SHIFT_TYPES_FILTER);
  const [selectedEntry, setSelectedEntry] = useState<DailyEarning | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>(ALL_SHIFT_TYPES_FILTER);
  const [isTemplateFilterOpen, setTemplateFilterOpen] = useState(false);
  const [isHistoryExpanded, setHistoryExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedShiftTypeEntry, setSelectedShiftTypeEntry] =
    useState<PayrollShiftTypeBreakdown | null>(null);

  const payrollSettings = useMemo(
    () => ({
      wageType: settings.wageType,
      hourlyWage: settings.hourlyWage,
      dailyWage: settings.dailyWage,
      breakDeductionEnabled: settings.breakDeductionEnabled,
      breakRules: settings.breakRules,
      lateNightPremium: settings.lateNightPremium,
      earlyMorningPremium: settings.earlyMorningPremium,
    }),
    [settings],
  );

  const payroll = useMemo(
    () => computeMonthlyPayroll(calendarEvents, month, payrollSettings),
    [calendarEvents, month, payrollSettings],
  );

  const dailyEarnings = useMemo(
    () => computeDailyEarnings(calendarEvents, month, payrollSettings),
    [calendarEvents, month, payrollSettings],
  );

  const shiftTypeOptions = useMemo(
    () => [
      ...new Set(
        dailyEarnings.map((entry) => entry.shiftType).filter((name): name is string => !!name),
      ),
    ],
    [dailyEarnings],
  );

  // シフト種別マスタの時間帯（テンプレート毎の想定給与に「早番 (9:00〜18:00)」の形で添えるための参照のみ、
  // 集計ロジックには影響しない）。
  const shiftTypeTimesByName = useMemo(
    () => new Map(shiftTypes.map((shiftType) => [shiftType.name, shiftType])),
    [shiftTypes],
  );

  const filteredEarnings =
    shiftTypeFilter === ALL_SHIFT_TYPES_FILTER
      ? dailyEarnings
      : dailyEarnings.filter((entry) => entry.shiftType === shiftTypeFilter);

  const orderedEarnings = sortOrder === 'asc' ? filteredEarnings : [...filteredEarnings].reverse();

  const visibleEarnings = isHistoryExpanded
    ? orderedEarnings
    : orderedEarnings.slice(0, HISTORY_PAGE_SIZE);

  const filteredByShiftType =
    templateFilter === ALL_SHIFT_TYPES_FILTER
      ? payroll.byShiftType
      : payroll.byShiftType.filter((entry) => entry.name === templateFilter);

  const monthLabel = format(month, 'M月', { locale: ja });

  // 月間の勤務日数・実働時間・（日給制の場合のみ）時給換算額。ドリルダウンの絞り込みには影響させず、
  // 常に月全体（dailyEarnings）から算出する。
  const totalWorkedDays = new Set(dailyEarnings.map((entry) => entry.date)).size;
  const totalWorkedHours = dailyEarnings.reduce((sum, entry) => sum + entry.workedHours, 0);
  const showEffectiveHourlyRate = settings.wageType === 'daily' && totalWorkedHours > 0;
  const effectiveHourlyRate = showEffectiveHourlyRate ? payroll.total / totalWorkedHours : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} hitSlop={Spacing.two} style={styles.navButton}>
          <ChevronLeft size={IconSize.medium} color={theme.primary} />
        </Pressable>
        <ThemedText type="headline" style={styles.monthLabel}>
          {label}
        </ThemedText>
        <Pressable onPress={goToNextMonth} hitSlop={Spacing.two} style={styles.navButton}>
          <ChevronRight size={IconSize.medium} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.totalCard}>
          <View style={styles.totalHeaderRow}>
            <IconBadge tone="blue" size={28}>
              <Wallet size={17} color={theme.primary} />
            </IconBadge>
            <ThemedText
              type="subheadline"
              themeColor="textSecondary"
              style={styles.totalHeaderLabel}
            >
              {monthLabel}の合計見込み
            </ThemedText>
          </View>

          <View style={styles.amountRow}>
            <ThemedText type="largeTitleMobile" themeColor="primary" style={styles.amountValue}>
              {Math.round(payroll.total).toLocaleString('ja-JP')}
            </ThemedText>
            <ThemedText type="title3" themeColor="primary" style={styles.amountUnit}>
              円
            </ThemedText>
          </View>

          <View style={[styles.statsFooter, { borderTopColor: theme.border }]}>
            <View style={styles.statsLeft}>
              <View style={styles.statItem}>
                <Briefcase size={IconSize.small} color={theme.textSecondary} />
                <ThemedText type="footnote" themeColor="textSecondary">
                  勤務{' '}
                  <ThemedText type="headline" style={styles.statNumber}>
                    {totalWorkedDays}
                  </ThemedText>{' '}
                  日
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <Clock size={IconSize.small} color={theme.textSecondary} />
                <ThemedText type="footnote" themeColor="textSecondary">
                  実働{' '}
                  <ThemedText type="headline" style={styles.statNumber}>
                    {formatHours(totalWorkedHours)}
                  </ThemedText>{' '}
                  時間
                </ThemedText>
              </View>
            </View>
            {showEffectiveHourlyRate && (
              <ThemedText type="caption1" themeColor="textSecondary">
                時給換算{formatYen(effectiveHourlyRate)}
              </ThemedText>
            )}
          </View>
        </Card>

        {shiftTypeOptions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.segmentedTrack, { backgroundColor: theme.border }]}>
              {[ALL_SHIFT_TYPES_FILTER, ...shiftTypeOptions].map((option) => {
                const selected = option === shiftTypeFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setShiftTypeFilter(option)}
                    style={[
                      styles.segmentedItem,
                      selected && { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <ThemedText
                      type="subheadline"
                      themeColor={selected ? 'text' : 'textSecondary'}
                      style={styles.segmentedLabel}
                    >
                      {option === ALL_SHIFT_TYPES_FILTER ? 'すべて' : option}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={[styles.sectionHeadingRow, styles.sectionHeading]}>
          <ThemedText type="headline" style={styles.sectionTitle}>
            簡易明細一覧
          </ThemedText>
          <Pressable
            onPress={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
            style={styles.dropdown}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp size={IconSize.small} color={theme.textSecondary} />
            ) : (
              <ArrowDown size={IconSize.small} color={theme.textSecondary} />
            )}
            <ThemedText type="footnote" themeColor="textSecondary">
              {sortOrder === 'asc' ? '昇順' : '降順'}
            </ThemedText>
          </Pressable>
        </View>

        {filteredEarnings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText type="subheadline" themeColor="textSecondary">
              この月のシフトはまだありません
            </ThemedText>
          </Card>
        ) : (
          <Card style={styles.listCard}>
            {visibleEarnings.map((entry, index) => (
              <Pressable
                key={`${entry.date}-${index}`}
                onPress={() => setSelectedEntry(entry)}
                style={[
                  styles.listRow,
                  index > 0 && {
                    borderTopColor: theme.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[styles.listRowIcon, { backgroundColor: badgeBlue.background }]}>
                  <CalendarDays size={20} color={theme.primary} />
                </View>
                <View style={styles.rowText}>
                  <View style={styles.listRowTitleLine}>
                    <ThemedText type="headline" style={styles.listRowDate}>
                      {formatShiftDate(entry.date)}
                    </ThemedText>
                    {entry.shiftType && (
                      <View style={[styles.shiftBadge, { backgroundColor: badgeBlue.background }]}>
                        <ThemedText type="caption2" themeColor="primary">
                          {entry.shiftType}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText type="footnote" themeColor="textSecondary">
                    {formatShiftTimeRange(
                      entry.startTime,
                      entry.endTime,
                      entry.endTime <= entry.startTime,
                    )}
                    {`（実働${formatHours(entry.workedHours)}h）`}
                  </ThemedText>
                </View>
                <View style={styles.listRowRight}>
                  <ThemedText type="headline" style={styles.listRowAmount}>
                    {formatYen(entry.earnings)}
                  </ThemedText>
                  <ChevronRight size={18} color={theme.textSecondary} />
                </View>
              </Pressable>
            ))}
            {!isHistoryExpanded && filteredEarnings.length > HISTORY_PAGE_SIZE && (
              <Pressable
                onPress={() => setHistoryExpanded(true)}
                style={[
                  styles.showMoreButton,
                  { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <ThemedText type="subheadline" themeColor="primary" style={styles.showMoreLabel}>
                  もっと見る（残り{filteredEarnings.length - HISTORY_PAGE_SIZE}件）
                </ThemedText>
                <ChevronDown size={18} color={theme.primary} />
              </Pressable>
            )}
          </Card>
        )}

        <View style={[styles.sectionHeadingRow, styles.sectionHeading]}>
          <ThemedText type="headline" style={styles.sectionTitle}>
            テンプレート毎の想定給与
          </ThemedText>
          <Pressable onPress={() => setTemplateFilterOpen(true)} style={styles.dropdown}>
            <ThemedText type="footnote" themeColor="textSecondary">
              {templateFilter === ALL_SHIFT_TYPES_FILTER ? 'すべて' : templateFilter}
            </ThemedText>
            <ChevronDown size={IconSize.small} color={theme.textSecondary} />
          </Pressable>
        </View>

        {filteredByShiftType.length > 0 && (
          <Card style={styles.templateGroupCard}>
            {filteredByShiftType.map((entry, index) => {
              const share = payroll.total > 0 ? entry.subtotal / payroll.total : 0;
              const seriesColor =
                theme[SERIES_COLOR_KEYS[index % SERIES_COLOR_KEYS.length]] ?? theme.primary;
              const shiftTypeMeta = shiftTypeTimesByName.get(entry.name);
              const countLabel =
                settings.wageType === 'daily' ? `${entry.count}日` : `${entry.count}回`;

              return (
                <Pressable
                  key={entry.name}
                  onPress={() => setSelectedShiftTypeEntry(entry)}
                  style={[
                    styles.templateEntry,
                    index > 0 && {
                      borderTopColor: theme.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.templateTitleRow}>
                    <View style={styles.templateNameGroup}>
                      <View style={[styles.seriesDot, { backgroundColor: seriesColor }]} />
                      <ThemedText type="subheadline" style={styles.templateName}>
                        {entry.name}
                        {shiftTypeMeta
                          ? ` (${formatShiftTimeRange(
                              shiftTypeMeta.startTime,
                              shiftTypeMeta.endTime,
                              shiftTypeMeta.endTime <= shiftTypeMeta.startTime,
                            )})`
                          : ''}
                      </ThemedText>
                    </View>
                    <ThemedText type="headline" style={styles.templateAmount}>
                      {formatYen(entry.subtotal)}
                    </ThemedText>
                  </View>
                  <View style={styles.templateStatsRow}>
                    <ThemedText type="caption1" themeColor="textSecondary">
                      {countLabel} / {formatHours(entry.hours)}時間
                    </ThemedText>
                    {payroll.total > 0 && (
                      <ThemedText type="caption1" themeColor="textSecondary">
                        {Math.round(share * 100)}%
                      </ThemedText>
                    )}
                  </View>
                  {payroll.total > 0 && (
                    <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(share * 100)}%`, backgroundColor: seriesColor },
                        ]}
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Card>
        )}

        <AdPlaceholder slot="payroll" style={styles.ad} />
      </ScrollView>

      <Dialog visible={!!selectedEntry} onClose={() => setSelectedEntry(null)}>
        {selectedEntry && (
          <>
            <ThemedText type="headline">{formatShiftDate(selectedEntry.date)}</ThemedText>
            {selectedEntry.shiftType && (
              <ThemedText type="subheadline" themeColor="textSecondary">
                {selectedEntry.shiftType}
              </ThemedText>
            )}
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                勤務時間
              </ThemedText>
              <ThemedText type="subheadline">
                {formatShiftTimeRange(
                  selectedEntry.startTime,
                  selectedEntry.endTime,
                  selectedEntry.endTime <= selectedEntry.startTime,
                )}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                実働時間
              </ThemedText>
              <ThemedText type="subheadline">
                {formatHours(selectedEntry.workedHours)}時間
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                休憩時間
              </ThemedText>
              <ThemedText type="subheadline">{selectedEntry.breakMinutes}分</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                給与見込み
              </ThemedText>
              <ThemedText type="headline">{formatYen(selectedEntry.earnings)}</ThemedText>
            </View>
            <PrimaryButton label="閉じる" onPress={() => setSelectedEntry(null)} />
          </>
        )}
      </Dialog>

      <Dialog visible={isTemplateFilterOpen} onClose={() => setTemplateFilterOpen(false)}>
        <ThemedText type="headline">シフト種別で絞り込み</ThemedText>
        {[ALL_SHIFT_TYPES_FILTER, ...payroll.byShiftType.map((entry) => entry.name)].map(
          (option) => (
            <Pressable
              key={option}
              onPress={() => {
                setTemplateFilter(option);
                setTemplateFilterOpen(false);
              }}
              style={styles.dialogOptionRow}
            >
              <ThemedText type="subheadline">
                {option === ALL_SHIFT_TYPES_FILTER ? 'すべて' : option}
              </ThemedText>
              {option === templateFilter && <Check size={IconSize.small} color={theme.primary} />}
            </Pressable>
          ),
        )}
      </Dialog>

      <Dialog visible={!!selectedShiftTypeEntry} onClose={() => setSelectedShiftTypeEntry(null)}>
        {selectedShiftTypeEntry && (
          <>
            <ThemedText type="headline">{selectedShiftTypeEntry.name}</ThemedText>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                回数
              </ThemedText>
              <ThemedText type="subheadline">{selectedShiftTypeEntry.count}回</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                合計実働時間
              </ThemedText>
              <ThemedText type="subheadline">
                {formatHours(selectedShiftTypeEntry.hours)}時間
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                {settings.wageType === 'daily' ? WAGE_TYPE_LABEL.daily : WAGE_TYPE_LABEL.hourly}
              </ThemedText>
              <ThemedText type="subheadline">
                {formatYen(
                  settings.wageType === 'daily' ? settings.dailyWage : settings.hourlyWage,
                )}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                給与見込み
              </ThemedText>
              <ThemedText type="headline">{formatYen(selectedShiftTypeEntry.subtotal)}</ThemedText>
            </View>
            <PrimaryButton label="閉じる" onPress={() => setSelectedShiftTypeEntry(null)} />
          </>
        )}
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  monthLabel: {
    fontWeight: '700',
  },
  scrollContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset,
  },
  totalCard: {
    gap: Spacing.one,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  totalHeaderLabel: {
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  amountValue: {
    fontWeight: '700',
  },
  amountUnit: {
    fontWeight: '600',
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  statsLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.half,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  statNumber: {
    fontWeight: '600',
  },
  segmentedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: Radius.small,
  },
  segmentedItem: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
  },
  segmentedLabel: {
    fontWeight: '600',
  },
  sectionHeading: {
    marginTop: Spacing.two,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  emptyCard: {
    alignItems: 'flex-start',
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.smallLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listRowDate: {
    fontWeight: '600',
  },
  shiftBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listRowAmount: {
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: 14,
  },
  showMoreLabel: {
    fontWeight: '500',
  },
  templateGroupCard: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  templateEntry: {
    gap: 6,
    paddingVertical: Spacing.two,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  seriesDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  templateName: {
    fontWeight: '600',
    flexShrink: 1,
  },
  templateAmount: {
    fontWeight: '600',
  },
  templateStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  ad: {
    marginTop: Spacing.two,
  },
});
