import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { router } from 'expo-router';
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
  Lock,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { DEPENDENCY_WALLS } from '@/constants/dependencyWalls';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { useTheme } from '@/hooks/use-theme';
import type { ShiftType, Workplace } from '@/models';
import {
  computeDailyEarnings,
  computeMonthlyPayroll,
  computeShiftBreakdown,
  computeYearlyIncome,
  shiftTypeKey,
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

const EMPTY_WORKPLACES: Workplace[] = [];

/** 給与計算タブ: 月ごとの合計見込み・簡易明細一覧・シフト種別別の想定給与を表示する。 */
export default function PayrollTab() {
  const theme = useTheme();
  const badgeBlue = useIconBadgeColors('blue');
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const workplaces = useAppStore((state) => state.user?.workplaces) ?? EMPTY_WORKPLACES;
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const dependencyAlertEnabled = useAppStore(
    (state) => state.user?.settings.dependencyAlertEnabled ?? true,
  );
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string>(ALL_SHIFT_TYPES_FILTER);
  const [selectedEntry, setSelectedEntry] = useState<DailyEarning | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>(ALL_SHIFT_TYPES_FILTER);
  const [isTemplateFilterOpen, setTemplateFilterOpen] = useState(false);
  const [isHistoryExpanded, setHistoryExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedShiftTypeEntry, setSelectedShiftTypeEntry] =
    useState<PayrollShiftTypeBreakdown | null>(null);

  const payroll = useMemo(
    () => computeMonthlyPayroll(calendarEvents, month, workplaces),
    [calendarEvents, month, workplaces],
  );

  const dailyEarnings = useMemo(
    () => computeDailyEarnings(calendarEvents, month, workplaces),
    [calendarEvents, month, workplaces],
  );

  // 扶養の壁アラート: 表示中の月に関わらず、常に実際の「今年」（暦年）の年収見込みを見る。
  const currentYear = new Date().getFullYear();
  const yearlyIncome = useMemo(
    () => computeYearlyIncome(calendarEvents, currentYear, workplaces),
    [calendarEvents, currentYear, workplaces],
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
  // 集計ロジックには影響しない）。勤務先をまたいで同名のシフト種別が混ざらないよう、
  // 勤務先ID+シフト種別名の複合キーで管理する。
  const shiftTypeTimesByKey = useMemo(() => {
    const map = new Map<string, ShiftType>();
    for (const workplace of workplaces) {
      for (const shiftType of workplace.shiftTypes) {
        map.set(shiftTypeKey(workplace.id, shiftType.name), shiftType);
      }
    }
    return map;
  }, [workplaces]);

  // 同じ名前のシフト種別が複数の勤務先にまたがって存在する場合だけ、表示名に勤務先名を付記する。
  const shiftTypeNameWorkplaceCount = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of payroll.byShiftType) {
      const workplaceIds = map.get(entry.name) ?? new Set<string>();
      workplaceIds.add(entry.workplaceId);
      map.set(entry.name, workplaceIds);
    }
    return map;
  }, [payroll.byShiftType]);

  const displayShiftTypeName = useCallback(
    (entry: PayrollShiftTypeBreakdown) => {
      const workplaceCount = shiftTypeNameWorkplaceCount.get(entry.name)?.size ?? 1;
      return workplaceCount > 1 ? `${entry.name}（${entry.workplaceName}）` : entry.name;
    },
    [shiftTypeNameWorkplaceCount],
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
      : payroll.byShiftType.filter(
          (entry) => shiftTypeKey(entry.workplaceId, entry.name) === templateFilter,
        );

  const templateFilterLabel = useMemo(() => {
    if (templateFilter === ALL_SHIFT_TYPES_FILTER) return 'すべて';
    const matched = payroll.byShiftType.find(
      (entry) => shiftTypeKey(entry.workplaceId, entry.name) === templateFilter,
    );
    return matched ? displayShiftTypeName(matched) : 'すべて';
  }, [templateFilter, payroll.byShiftType, displayShiftTypeName]);

  const monthLabel = format(month, 'M月', { locale: ja });

  const selectedShiftTypeWorkplace = useMemo(
    () => workplaces.find((w) => w.id === selectedShiftTypeEntry?.workplaceId) ?? null,
    [selectedShiftTypeEntry, workplaces],
  );

  // 想定給与ダイアログの「1日あたり」行: シフト種別マスタの時間帯と該当勤務先の給与設定から1日分の給与見込みを算出する。
  const selectedShiftTypeDayBreakdown = useMemo(() => {
    if (!selectedShiftTypeEntry || !selectedShiftTypeWorkplace) return null;
    const shiftTypeMeta = shiftTypeTimesByKey.get(
      shiftTypeKey(selectedShiftTypeEntry.workplaceId, selectedShiftTypeEntry.name),
    );
    if (!shiftTypeMeta) return null;
    const { settings } = selectedShiftTypeWorkplace;
    return computeShiftBreakdown(
      shiftTypeMeta.startTime,
      shiftTypeMeta.endTime,
      settings.wageType,
      settings.hourlyWage,
      settings.dailyWage,
      settings.breakDeductionEnabled,
      settings.breakRules,
      settings.lateNightPremium,
      settings.earlyMorningPremium,
    );
  }, [selectedShiftTypeEntry, selectedShiftTypeWorkplace, shiftTypeTimesByKey]);

  // 月間の勤務日数・実働時間・時給換算額。ドリルダウンの絞り込みには影響させず、
  // 常に月全体（dailyEarnings）から算出する。
  const totalWorkedDays = new Set(dailyEarnings.map((entry) => entry.date)).size;
  const totalWorkedHours = dailyEarnings.reduce((sum, entry) => sum + entry.workedHours, 0);
  const showEffectiveHourlyRate = totalWorkedHours > 0;
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

        {isPro && dependencyAlertEnabled && (
          <Card style={styles.dependencyCard}>
            <View style={styles.totalHeaderRow}>
              <IconBadge tone="orange" size={28}>
                <TriangleAlert size={17} color={theme.orange} />
              </IconBadge>
              <ThemedText
                type="subheadline"
                themeColor="textSecondary"
                style={styles.totalHeaderLabel}
              >
                {currentYear}年の年収見込みと扶養の壁
              </ThemedText>
            </View>

            {DEPENDENCY_WALLS.map((wall) => {
              const ratio = Math.min(yearlyIncome / wall.threshold, 1);
              const remaining = wall.threshold - yearlyIncome;
              const isOver = remaining <= 0;
              const isNear = !isOver && ratio >= 0.9;
              const barColor = isOver ? theme.danger : isNear ? theme.orange : theme.primary;

              return (
                <View key={wall.threshold} style={styles.wallRow}>
                  <View style={styles.wallHeaderRow}>
                    <ThemedText type="subheadline" style={styles.wallLabel}>
                      {wall.label}
                    </ThemedText>
                    <ThemedText
                      type="footnote"
                      themeColor={isOver ? 'danger' : 'textSecondary'}
                      style={isNear && !isOver ? { color: theme.orange } : undefined}
                    >
                      {isOver
                        ? `${formatYen(Math.abs(remaining))}超過`
                        : `残り${formatYen(remaining)}`}
                    </ThemedText>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <ThemedText type="caption2" themeColor="textSecondary">
                    {wall.description}
                  </ThemedText>
                </View>
              );
            })}

            <View style={[styles.statsFooter, { borderTopColor: theme.border }]}>
              <ThemedText type="footnote" themeColor="textSecondary">
                {currentYear}年の合計見込み
              </ThemedText>
              <ThemedText type="headline">{formatYen(yearlyIncome)}</ThemedText>
            </View>
            <ThemedText type="caption2" themeColor="textSecondary">
              登録済みのシフトのみの集計です。条件は働き方や勤務先によって異なるため目安としてご覧ください。
            </ThemedText>
          </Card>
        )}

        {!isPro && (
          <Card style={styles.dependencyCard}>
            <View style={styles.totalHeaderRow}>
              <IconBadge tone="orange" size={28}>
                <Lock size={17} color={theme.orange} />
              </IconBadge>
              <ThemedText
                type="subheadline"
                themeColor="textSecondary"
                style={styles.totalHeaderLabel}
              >
                扶養の壁アラート
              </ThemedText>
              <View style={[styles.proPill, { backgroundColor: theme.orange }]}>
                <ThemedText type="caption2" style={{ color: theme.onPrimary }}>
                  PRO
                </ThemedText>
              </View>
            </View>
            <ThemedText type="footnote" themeColor="textSecondary">
              複数勤務先の年収を自動合算し、103万・106万・130万円の壁への接近をお知らせします。
            </ThemedText>
            <PrimaryButton label="PROにアップグレード" onPress={() => router.push('/paywall')} />
          </Card>
        )}

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
            シフト種別毎の想定給与
          </ThemedText>
          <Pressable onPress={() => setTemplateFilterOpen(true)} style={styles.dropdown}>
            <ThemedText type="footnote" themeColor="textSecondary">
              {templateFilterLabel}
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
              const shiftTypeMeta = shiftTypeTimesByKey.get(
                shiftTypeKey(entry.workplaceId, entry.name),
              );
              const entryWorkplace = workplaces.find((w) => w.id === entry.workplaceId);
              const countLabel =
                entryWorkplace?.settings.wageType === 'daily'
                  ? `${entry.days}日`
                  : `${entry.count}回`;

              return (
                <Pressable
                  key={shiftTypeKey(entry.workplaceId, entry.name)}
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
                        {displayShiftTypeName(entry)}
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
        {[
          { key: ALL_SHIFT_TYPES_FILTER, label: 'すべて' },
          ...payroll.byShiftType.map((entry) => ({
            key: shiftTypeKey(entry.workplaceId, entry.name),
            label: displayShiftTypeName(entry),
          })),
        ].map((option) => (
          <Pressable
            key={option.key}
            onPress={() => {
              setTemplateFilter(option.key);
              setTemplateFilterOpen(false);
            }}
            style={styles.dialogOptionRow}
          >
            <ThemedText type="subheadline">{option.label}</ThemedText>
            {option.key === templateFilter && <Check size={IconSize.small} color={theme.primary} />}
          </Pressable>
        ))}
      </Dialog>

      <Dialog visible={!!selectedShiftTypeEntry} onClose={() => setSelectedShiftTypeEntry(null)}>
        {selectedShiftTypeEntry && (
          <>
            <ThemedText type="headline">{displayShiftTypeName(selectedShiftTypeEntry)}</ThemedText>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                日数
              </ThemedText>
              <ThemedText type="subheadline">{selectedShiftTypeEntry.days}日</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                合計実働時間
              </ThemedText>
              <ThemedText type="subheadline">
                {formatHours(selectedShiftTypeEntry.hours)}時間
              </ThemedText>
            </View>
            {selectedShiftTypeWorkplace && (
              <View style={styles.detailRow}>
                <ThemedText type="subheadline" themeColor="textSecondary">
                  {selectedShiftTypeWorkplace.settings.wageType === 'daily'
                    ? WAGE_TYPE_LABEL.daily
                    : WAGE_TYPE_LABEL.hourly}
                </ThemedText>
                <ThemedText type="subheadline">
                  {formatYen(
                    selectedShiftTypeWorkplace.settings.wageType === 'daily'
                      ? selectedShiftTypeWorkplace.settings.dailyWage
                      : selectedShiftTypeWorkplace.settings.hourlyWage,
                  )}
                </ThemedText>
              </View>
            )}
            {selectedShiftTypeDayBreakdown && (
              <View style={styles.detailRow}>
                <ThemedText type="subheadline" themeColor="textSecondary">
                  1日あたり
                </ThemedText>
                <ThemedText type="subheadline">
                  {formatYen(selectedShiftTypeDayBreakdown.earnings)}
                </ThemedText>
              </View>
            )}
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
  dependencyCard: {
    gap: Spacing.two,
  },
  wallRow: {
    gap: Spacing.half,
  },
  wallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wallLabel: {
    fontWeight: '600',
  },
  proPill: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
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
