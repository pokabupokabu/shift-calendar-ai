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
  CircleDollarSign,
  Clock,
  Coffee,
  Coins,
  JapaneseYen,
  Lock,
  Timer,
  TriangleAlert,
  Wallet,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { DetailRow, ROW_ICON_BADGE_SIZE } from '@/components/calendar/shift-detail-card';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset,
  IconBadgeTones,
  IconSize,
  Radius,
  Spacing,
  type IconBadgeTone,
} from '@/constants/theme';
import { resolveDependencyWalls } from '@/constants/dependencyWalls';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isShiftTypeRegistered, type RegisteredShiftType, type Workplace } from '@/models';
import {
  computeDailyEarnings,
  computeMonthlyPayroll,
  countAllDayEventsInYear,
  computeShiftBreakdown,
  computeYearlyIncome,
  shiftTypeKey,
  type DailyEarning,
  type PayrollShiftTypeBreakdown,
} from '@/utils/computePayroll';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';
import { resolveShiftTypeIcon, resolveShiftTypeTone } from '@/utils/resolveShiftTypeTone';
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

/**
 * 「簡易明細一覧」の横の種別の絞り込みに、そのまま並べるシフト種別の数。
 * 「すべて」＋2種別＋（3種別以上あるときだけ）「その他 ⌄」の最大4つにする（2026-10-18 ユーザー決定）。
 */
const INLINE_SHIFT_TYPE_FILTER_COUNT = 2;

/**
 * 絞り込みの見た目の高さは約27pt。上下に9ptずつ広げて、押せる高さを44pt相当にする。
 * 左右は隣のボタンと押せる範囲が重ならないよう広げない。
 */
const FILTER_HIT_SLOP = { top: 9, bottom: 9, left: 0, right: 0 };
/** 「↑昇順」も同じく、押せる高さを44pt相当にする。 */
const SORT_HIT_SLOP = { top: 13, bottom: 13, left: Spacing.two, right: Spacing.two };

/**
 * 扶養の壁の棒の色の決まり（2026-10-18 ユーザー決定）。どの壁も同じ:
 * 50%未満＝青、50%以上75%未満＝オレンジ（黄色はPROの金と紛れるため）、75%以上＝赤。
 */
const WALL_RATIO_ORANGE = 0.5;
const WALL_RATIO_RED = 0.75;

const EMPTY_WORKPLACES: Workplace[] = [];

/** 給与計算タブ: 月ごとの合計見込み・簡易明細一覧・シフト種別別の想定給与を表示する。 */
export default function PayrollTab() {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const badgeBlue = useIconBadgeColors('blue');
  const badgeGold = useIconBadgeColors('gold');
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const workplaces = useAppStore((state) => state.user?.workplaces) ?? EMPTY_WORKPLACES;
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const dependencyAlertEnabled = useAppStore(
    (state) => state.user?.settings.dependencyAlertEnabled ?? true,
  );
  const dependencyBirthYear = useAppStore((state) => state.user?.settings.birthYear);
  const dependencyIsDaytimeStudent = useAppStore((state) => state.user?.settings.isDaytimeStudent);
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  // 無料プランは当月のみ閲覧可能。ボタンは残しつつ（鍵マークを添える）、タップ時にペイウォールへ誘導する。
  const handlePrevMonth = () => (isPro ? goToPrevMonth() : router.push('/paywall'));
  const handleNextMonth = () => (isPro ? goToNextMonth() : router.push('/paywall'));
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string>(ALL_SHIFT_TYPES_FILTER);
  const [isMoreShiftTypesOpen, setMoreShiftTypesOpen] = useState(false);
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

  // 時刻が不明な終日シフトは金額を計算できないため集計から外している。0円として計上すると
  // 年収見込みが実際より低く出て壁の判定を誤らせるので、除外した件数を明示する。
  const yearlyAllDayExcludedCount = useMemo(
    () => countAllDayEventsInYear(calendarEvents, currentYear),
    [calendarEvents, currentYear],
  );

  // 年収の壁は年齢（12/31時点）と年分で変わるため、設定値から組み立てる。
  // 生まれ年が未設定のときは壁を出さず、設定を促す（一般的な130万円を出すと19〜22歳に誤った壁を見せるため）。
  const dependencyWallSet = useMemo(
    () =>
      resolveDependencyWalls({
        year: currentYear,
        birthYear: dependencyBirthYear,
        isDaytimeStudent: dependencyIsDaytimeStudent,
      }),
    [currentYear, dependencyBirthYear, dependencyIsDaytimeStudent],
  );

  // その月に勤務がある種別名。並び順はマイカスタムのシフト種別の並び（勤務先の順→種別の順）に揃え、
  // 絞り込みに「最初の2種別」として出す種別が月によって入れ替わらないようにする。
  const shiftTypeOptions = useMemo(() => {
    const masterOrder = [
      ...new Set(workplaces.flatMap((w) => w.shiftTypes.map((shiftType) => shiftType.name))),
    ];
    const present = [
      ...new Set(
        dailyEarnings.map((entry) => entry.shiftType).filter((name): name is string => !!name),
      ),
    ];
    const orderOf = (name: string) => {
      const index = masterOrder.indexOf(name);
      return index < 0 ? masterOrder.length : index;
    };
    // Array.prototype.sort は安定ソートなので、マスタに無い種別は出てきた順のまま末尾に並ぶ。
    return present.sort((a, b) => orderOf(a) - orderOf(b));
  }, [dailyEarnings, workplaces]);

  // 月を移動して、選んでいた種別がその月に無くなったときは「すべて」に戻して見せる。
  const activeShiftTypeFilter =
    shiftTypeFilter === ALL_SHIFT_TYPES_FILTER || shiftTypeOptions.includes(shiftTypeFilter)
      ? shiftTypeFilter
      : ALL_SHIFT_TYPES_FILTER;
  const inlineShiftTypes = shiftTypeOptions.slice(0, INLINE_SHIFT_TYPE_FILTER_COUNT);
  const moreShiftTypes = shiftTypeOptions.slice(INLINE_SHIFT_TYPE_FILTER_COUNT);
  const selectedMoreShiftType = moreShiftTypes.includes(activeShiftTypeFilter)
    ? activeShiftTypeFilter
    : undefined;

  // シフト種別マスタの時間帯（テンプレート毎の想定給与に「早番 (9:00〜18:00)」の形で添えるための参照のみ、
  // 集計ロジックには影響しない）。勤務先をまたいで同名のシフト種別が混ざらないよう、
  // 勤務先ID+シフト種別名の複合キーで管理する。
  // 時刻が未登録の種別は載せない（時間帯の表示も「1日あたり」も出さない）。
  const shiftTypeTimesByKey = useMemo(() => {
    const map = new Map<string, RegisteredShiftType>();
    for (const workplace of workplaces) {
      for (const shiftType of workplace.shiftTypes) {
        if (!isShiftTypeRegistered(shiftType)) continue;
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

  /** シフト種別の色（マイカスタム・カレンダーと同じ規則）。種別が無い・見つからないときは青。 */
  const shiftToneOf = useCallback(
    (workplaceId: string | undefined, shiftTypeName: string | undefined): IconBadgeTone =>
      resolveShiftTypeTone(workplaces, workplaceId, shiftTypeName),
    [workplaces],
  );

  const filteredEarnings =
    activeShiftTypeFilter === ALL_SHIFT_TYPES_FILTER
      ? dailyEarnings
      : dailyEarnings.filter((entry) => entry.shiftType === activeShiftTypeFilter);

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

  // 月間の勤務日数・実働時間。ドリルダウンの絞り込みには影響させず、常に月全体（dailyEarnings）から算出する。
  const totalWorkedDays = new Set(dailyEarnings.map((entry) => entry.date)).size;
  const totalWorkedHours = dailyEarnings.reduce((sum, entry) => sum + entry.workedHours, 0);

  // 「詳しい説明・年齢の設定」と「生まれ年を設定する」の行き先。
  // TODO: 設定タブに「扶養の壁の詳しい説明・年齢の設定」の項目ができたら、そちらへ変える
  // （docs/ui-review/group-a.md サブグループ③の決定13・14。今は生まれ年の設定があるアカウント画面へ）。
  const openDependencySettings = () => router.push('/settings/account');

  const yearlyTotalRow = (
    <View style={[styles.statsFooter, { borderTopColor: theme.border }]}>
      <ThemedText type="footnote" themeColor="textSecondary">
        {currentYear}年の合計見込み
      </ThemedText>
      <ThemedText type="headline">{formatYen(yearlyIncome)}</ThemedText>
    </View>
  );

  const yearlyAllDayNote =
    yearlyAllDayExcludedCount > 0 ? (
      <ThemedText type="caption2" themeColor="textSecondary">
        終日シフト{yearlyAllDayExcludedCount}
        件は時刻が不明なため、この年収見込みに含めていません。実際の年収はこの金額より多くなります。
      </ThemedText>
    ) : null;

  return (
    <Screen>
      <View style={styles.topSection}>
        <ThemedText type="title1">給与</ThemedText>

        <View style={styles.header}>
          <Pressable
            onPress={handlePrevMonth}
            hitSlop={Spacing.one}
            accessibilityRole="button"
            accessibilityLabel={isPro ? '前の月' : '前の月（PRO）'}
            style={({ pressed }) => [
              styles.navButton,
              pressed && { backgroundColor: badgeBlue.background },
            ]}
          >
            <ChevronLeft size={IconSize.medium} color={theme.primary} />
            {!isPro && <Lock size={NAV_LOCK_SIZE} color={theme.primary} />}
          </Pressable>
          <ThemedText type="headline" style={styles.monthLabel}>
            {label}
          </ThemedText>
          <Pressable
            onPress={handleNextMonth}
            hitSlop={Spacing.one}
            accessibilityRole="button"
            accessibilityLabel={isPro ? '次の月' : '次の月（PRO）'}
            style={({ pressed }) => [
              styles.navButton,
              pressed && { backgroundColor: badgeBlue.background },
            ]}
          >
            {!isPro && <Lock size={NAV_LOCK_SIZE} color={theme.primary} />}
            <ChevronRight size={IconSize.medium} color={theme.primary} />
          </Pressable>
        </View>
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
            <ThemedText type="title1" themeColor="primary">
              {Math.round(payroll.total).toLocaleString('ja-JP')}
            </ThemedText>
            <ThemedText type="title3" themeColor="primary" style={styles.amountUnit}>
              円
            </ThemedText>
          </View>

          {payroll.allDayExcludedCount > 0 && (
            <ThemedText type="caption2" themeColor="textSecondary">
              終日シフト{payroll.allDayExcludedCount}
              件は時刻が不明なため、この金額に含めていません。
            </ThemedText>
          )}

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

            {dependencyWallSet.isGeneric ? (
              <>
                <ThemedText type="subheadline" themeColor="textSecondary">
                  生まれ年を設定すると、あなたに合った壁が表示されます
                </ThemedText>
                <PrimaryButton
                  variant="bluePill"
                  label="生まれ年を設定する"
                  onPress={openDependencySettings}
                />
                {yearlyTotalRow}
                {yearlyAllDayNote}
              </>
            ) : (
              <>
                <ThemedText type="footnote" themeColor="textSecondary">
                  {currentYear}年12月31日時点で
                  {/* 対象年齢の部分だけ、淡い青の地＋青の太字で強調する（前後の空白は地の余白の代わり） */}
                  <Text
                    style={[
                      styles.ageHighlight,
                      { backgroundColor: badgeBlue.background, color: theme.primary },
                    ]}
                  >
                    {dependencyWallSet.isSpecificRelativeAge
                      ? ' 19〜22歳の方向け '
                      : ' 19〜22歳以外の方向け '}
                  </Text>
                  の目安です。
                </ThemedText>

                {dependencyWallSet.walls.map((wall) => {
                  const ratio = Math.min(yearlyIncome / wall.threshold, 1);
                  const remaining = wall.threshold - yearlyIncome;
                  const isOver = remaining <= 0;
                  const isHigh = ratio >= WALL_RATIO_RED;
                  const barColor = isHigh
                    ? theme.danger
                    : ratio >= WALL_RATIO_ORANGE
                      ? theme.orange
                      : theme.primary;

                  return (
                    <View key={wall.id} style={styles.wallRow}>
                      <View style={styles.wallHeaderRow}>
                        <ThemedText type="subheadline" style={styles.wallLabel}>
                          {wall.label}
                        </ThemedText>
                        {/* 残りの文字は、棒が赤（75%以上・超過）のときだけ赤くする */}
                        <ThemedText
                          type="footnote"
                          themeColor={isHigh ? 'danger' : 'textSecondary'}
                          style={styles.wallRemaining}
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
                      <ThemedText type="footnote" themeColor="textSecondary">
                        {wall.shortDescription}
                      </ThemedText>
                    </View>
                  );
                })}

                {yearlyTotalRow}
                {yearlyAllDayNote}

                {/* 長い注意書き・住民税の一言は、設定タブに作る新しい項目へ移す（決定13） */}
                <Pressable
                  onPress={openDependencySettings}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.linkRow,
                    { borderTopColor: theme.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <ThemedText type="subheadline" themeColor="primary" style={styles.linkLabel}>
                    詳しい説明・年齢の設定
                  </ThemedText>
                  <ChevronRight size={IconSize.small} color={theme.primary} />
                </Pressable>
              </>
            )}
          </Card>
        )}

        {!isPro && (
          <Card style={styles.dependencyCard}>
            <View style={styles.totalHeaderRow}>
              <IconBadge tone="gold" size={28}>
                <Lock size={17} color={badgeGold.icon} />
              </IconBadge>
              <ThemedText
                type="subheadline"
                themeColor="textSecondary"
                style={styles.totalHeaderLabel}
              >
                扶養の壁アラート
              </ThemedText>
              <View style={[styles.proPill, { backgroundColor: theme.gold }]}>
                <ThemedText type="caption2" style={[styles.proPillLabel, { color: theme.onGold }]}>
                  PRO
                </ThemedText>
              </View>
            </View>
            <ThemedText type="footnote" themeColor="textSecondary">
              複数勤務先の年収を自動合算し、年齢とその年の制度に合わせた「年収の壁」への接近をお知らせします。
            </ThemedText>
            <PrimaryButton
              variant="bluePill"
              label="PROにアップグレード"
              onPress={() => router.push('/paywall')}
            />
          </Card>
        )}

        <View style={[styles.sectionHeadingRow, styles.sectionHeading]}>
          <View style={styles.listHeadingGroup}>
            <ThemedText type="headline" numberOfLines={1} style={styles.listHeadingTitle}>
              簡易明細一覧
            </ThemedText>
            {shiftTypeOptions.length > 0 && (
              <View
                style={[
                  styles.filterTrack,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <FilterSegment
                  label="すべて"
                  selected={activeShiftTypeFilter === ALL_SHIFT_TYPES_FILTER}
                  onPress={() => setShiftTypeFilter(ALL_SHIFT_TYPES_FILTER)}
                />
                {inlineShiftTypes.map((name) => (
                  <FilterSegment
                    key={name}
                    label={name}
                    selected={activeShiftTypeFilter === name}
                    onPress={() => setShiftTypeFilter(name)}
                    shrinkable
                  />
                ))}
                {moreShiftTypes.length > 0 && (
                  <FilterSegment
                    label={selectedMoreShiftType ?? 'その他'}
                    selected={!!selectedMoreShiftType}
                    onPress={() => setMoreShiftTypesOpen(true)}
                    showsMenu
                    shrinkable={!!selectedMoreShiftType}
                  />
                )}
              </View>
            )}
          </View>
          <Pressable
            onPress={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
            hitSlop={SORT_HIT_SLOP}
            accessibilityRole="button"
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
            {visibleEarnings.map((entry, index) => {
              const tone = shiftToneOf(entry.workplaceId, entry.shiftType);
              const toneColors = IconBadgeTones[colorScheme][tone];
              // マイカスタムで設定したシフト種別の絵（カレンダーのリスト表示と同じ）。種別が無い勤務はカレンダーの絵。
              const ShiftIcon =
                resolveShiftTypeIcon(workplaces, entry.workplaceId, entry.shiftType) ??
                CalendarDays;
              return (
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
                  <IconBadge tone={tone} size={32}>
                    <ShiftIcon size={IconSize.small} color={toneColors.icon} />
                  </IconBadge>
                  <View style={styles.rowText}>
                    <View style={styles.listRowTitleLine}>
                      <ThemedText type="headline" style={styles.listRowDate}>
                        {formatShiftDate(entry.date)}
                      </ThemedText>
                      {entry.shiftType ? (
                        <View
                          style={[styles.shiftBadge, { backgroundColor: toneColors.background }]}
                        >
                          <ThemedText
                            type="caption2"
                            numberOfLines={1}
                            style={{ color: toneColors.icon }}
                          >
                            {entry.shiftType}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    {/* 実働時間は行を押したときの小窓で見る（2026-10-18 ユーザー決定。SEの幅で切れないように） */}
                    <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
                      {formatShiftTimeRange(
                        entry.startTime,
                        entry.endTime,
                        entry.endTime <= entry.startTime,
                      )}
                    </ThemedText>
                  </View>
                  <View style={styles.listRowRight}>
                    <ThemedText type="headline" style={styles.listRowAmount}>
                      {formatYen(entry.earnings)}
                    </ThemedText>
                    <ChevronRight size={18} color={theme.textSecondary} />
                  </View>
                </Pressable>
              );
            })}
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
              // 点と棒は、明細の行と同じシフト種別の色（早番＝オレンジ、遅番＝紫 …）。
              const seriesColor =
                IconBadgeTones[colorScheme][shiftToneOf(entry.workplaceId, entry.name)].icon;
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

      {/* 明細の行を押したときの小窓（カレンダーの小窓と同じ作り） */}
      <Dialog visible={!!selectedEntry} onClose={() => setSelectedEntry(null)}>
        {selectedEntry && (
          <>
            <DialogTitleRow
              title={formatShiftDate(selectedEntry.date)}
              shiftTypeName={selectedEntry.shiftType}
              tone={shiftToneOf(selectedEntry.workplaceId, selectedEntry.shiftType)}
            />
            <Card>
              <DetailRow Icon={Clock} label="勤務時間">
                <ThemedText type="headline">
                  {formatShiftTimeRange(
                    selectedEntry.startTime,
                    selectedEntry.endTime,
                    selectedEntry.endTime <= selectedEntry.startTime,
                  )}
                </ThemedText>
              </DetailRow>
              <DetailRow Icon={Timer} label="実働時間">
                <ThemedText type="headline">
                  {formatHours(selectedEntry.workedHours)}時間
                </ThemedText>
              </DetailRow>
              <DetailRow Icon={Coffee} label="休憩時間">
                <ThemedText type="headline">{selectedEntry.breakMinutes}分</ThemedText>
              </DetailRow>
              <EarningsRow amount={selectedEntry.earnings} />
            </Card>
            <SecondaryButton label="閉じる" onPress={() => setSelectedEntry(null)} />
          </>
        )}
      </Dialog>

      <ShiftTypeFilterDialog
        visible={isTemplateFilterOpen}
        onClose={() => setTemplateFilterOpen(false)}
        options={[
          { key: ALL_SHIFT_TYPES_FILTER, label: 'すべて' },
          ...payroll.byShiftType.map((entry) => ({
            key: shiftTypeKey(entry.workplaceId, entry.name),
            label: displayShiftTypeName(entry),
          })),
        ]}
        selectedKey={templateFilter}
        onSelect={(key) => {
          setTemplateFilter(key);
          setTemplateFilterOpen(false);
        }}
      />

      {/* 「簡易明細一覧」の絞り込みの「その他 ⌄」: 3つ目以降の種別から選ぶ */}
      <ShiftTypeFilterDialog
        visible={isMoreShiftTypesOpen}
        onClose={() => setMoreShiftTypesOpen(false)}
        options={moreShiftTypes.map((name) => ({ key: name, label: name }))}
        selectedKey={activeShiftTypeFilter}
        onSelect={(key) => {
          setShiftTypeFilter(key);
          setMoreShiftTypesOpen(false);
        }}
      />

      {/* 想定給与の行を押したときの小窓（カレンダーの小窓と同じ作り） */}
      <Dialog visible={!!selectedShiftTypeEntry} onClose={() => setSelectedShiftTypeEntry(null)}>
        {selectedShiftTypeEntry && (
          <>
            <DialogTitleRow
              title={`${monthLabel}の想定給与`}
              shiftTypeName={displayShiftTypeName(selectedShiftTypeEntry)}
              tone={shiftToneOf(selectedShiftTypeEntry.workplaceId, selectedShiftTypeEntry.name)}
            />
            <Card>
              <DetailRow Icon={CalendarDays} label="日数">
                <ThemedText type="headline">{selectedShiftTypeEntry.days}日</ThemedText>
              </DetailRow>
              <DetailRow Icon={Timer} label="合計実働時間">
                <ThemedText type="headline">
                  {formatHours(selectedShiftTypeEntry.hours)}時間
                </ThemedText>
              </DetailRow>
              {selectedShiftTypeWorkplace && (
                <DetailRow
                  Icon={CircleDollarSign}
                  label={
                    selectedShiftTypeWorkplace.settings.wageType === 'daily'
                      ? WAGE_TYPE_LABEL.daily
                      : WAGE_TYPE_LABEL.hourly
                  }
                >
                  <ThemedText type="headline">
                    {formatYen(
                      selectedShiftTypeWorkplace.settings.wageType === 'daily'
                        ? selectedShiftTypeWorkplace.settings.dailyWage
                        : selectedShiftTypeWorkplace.settings.hourlyWage,
                    )}
                  </ThemedText>
                </DetailRow>
              )}
              {selectedShiftTypeDayBreakdown && (
                <DetailRow Icon={Coins} label="1日あたり">
                  <ThemedText type="headline">
                    {formatYen(selectedShiftTypeDayBreakdown.earnings)}
                  </ThemedText>
                </DetailRow>
              )}
              <EarningsRow amount={selectedShiftTypeEntry.subtotal} />
            </Card>
            <SecondaryButton label="閉じる" onPress={() => setSelectedShiftTypeEntry(null)} />
          </>
        )}
      </Dialog>
    </Screen>
  );
}

/** 無料のときに月送りの矢印の横に添える鍵の大きさ。 */
const NAV_LOCK_SIZE = 14;

/** 「簡易明細一覧」の横の、小さめの種別の切り替えの1つ。 */
function FilterSegment({
  label,
  selected,
  onPress,
  showsMenu,
  shrinkable,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 「その他 ⌄」のように、押すと一覧が開くもの。 */
  showsMenu?: boolean;
  /** 種別名が長いときに、ここから先に「…」で詰める。 */
  shrinkable?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={FILTER_HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.filterSegment,
        shrinkable ? styles.filterSegmentShrinkable : styles.filterSegmentFixed,
        selected && [styles.filterSegmentActive, { backgroundColor: theme.backgroundElement }],
      ]}
    >
      <ThemedText
        type="caption2"
        numberOfLines={1}
        style={[
          styles.filterLabel,
          // 選んでいない側も読みやすいよう、灰色ではなく本文の色にする（決定7）
          { color: theme.text, fontWeight: selected ? '700' : '500' },
        ]}
      >
        {label}
      </ThemedText>
      {showsMenu && <ChevronDown size={FILTER_CHEVRON_SIZE} color={theme.text} />}
    </Pressable>
  );
}

const FILTER_CHEVRON_SIZE = 10;

/** 小窓の上の行: 左にタイトル、右にシフト種別の色の札（カレンダーの小窓と同じ）。 */
function DialogTitleRow({
  title,
  shiftTypeName,
  tone,
}: {
  title: string;
  shiftTypeName: string | undefined;
  tone: IconBadgeTone;
}) {
  const colors = useIconBadgeColors(tone);
  return (
    <View style={styles.dialogTitleRow}>
      <ThemedText type="title2" style={styles.dialogTitle}>
        {title}
      </ThemedText>
      {shiftTypeName ? (
        <View style={[styles.dialogShiftTypePill, { backgroundColor: colors.background }]}>
          <ThemedText
            type="footnote"
            numberOfLines={1}
            style={[styles.dialogShiftTypeLabel, { color: colors.icon }]}
          >
            {shiftTypeName}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** 小窓のいちばん下の「給与見込み」（カレンダーの小窓と同じく区切り線の下で強調する）。 */
function EarningsRow({ amount }: { amount: number }) {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  return (
    <>
      <View style={[styles.dialogDivider, { backgroundColor: theme.border }]} />
      <View style={styles.dialogEarningsRow}>
        <View style={styles.dialogEarningsLabel}>
          <IconBadge tone="blue" size={ROW_ICON_BADGE_SIZE}>
            <JapaneseYen size={IconSize.small} color={blueBadge.icon} />
          </IconBadge>
          <ThemedText type="headline" themeColor="primary">
            給与見込み
          </ThemedText>
        </View>
        <ThemedText type="title2" themeColor="primary">
          {formatYen(amount)}
        </ThemedText>
      </View>
    </>
  );
}

/** シフト種別を1つ選ぶ小窓（想定給与の「すべて ⌄」と、明細の「その他 ⌄」で共通）。 */
function ShiftTypeFilterDialog({
  visible,
  onClose,
  options,
  selectedKey,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <Dialog visible={visible} onClose={onClose}>
      <ThemedText type="title2">シフト種別で絞り込み</ThemedText>
      <Card style={styles.optionCard}>
        <ScrollView style={styles.optionScroll} showsVerticalScrollIndicator={false}>
          {options.map((option, index) => (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: option.key === selectedKey }}
              style={({ pressed }) => [
                styles.dialogOptionRow,
                index > 0 && {
                  borderTopColor: theme.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText
                type="body"
                themeColor={option.key === selectedKey ? 'primary' : 'text'}
                style={styles.optionLabel}
              >
                {option.label}
              </ThemedText>
              {option.key === selectedKey && <Check size={IconSize.small} color={theme.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      </Card>
      <SecondaryButton label="閉じる" onPress={onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  topSection: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minWidth: 40,
    height: 40,
    paddingHorizontal: Spacing.one,
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
    gap: Spacing.three,
  },
  ageHighlight: {
    fontWeight: '700',
  },
  wallRow: {
    gap: Spacing.one,
  },
  wallHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  wallLabel: {
    fontWeight: '600',
  },
  wallRemaining: {
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  linkLabel: {
    fontWeight: '500',
  },
  proPill: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  proPillLabel: {
    fontWeight: '700',
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  totalHeaderLabel: {
    fontWeight: '500',
    flexShrink: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
  },
  amountUnit: {
    fontWeight: '700',
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
    columnGap: Spacing.four,
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
  sectionHeading: {
    marginTop: Spacing.two,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  // iPhone SE（中身の幅327pt）で「簡易明細一覧」＋絞り込み4つ＋「↑昇順」が1行に収まるよう、
  // 絞り込みは11pt・左右4ptの詰めた作りにし、はみ出すときは種別名から「…」で詰める。
  listHeadingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  listHeadingTitle: {
    fontWeight: '700',
    flexShrink: 0,
  },
  filterTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    borderRadius: Radius.small,
    borderWidth: 1,
    padding: Spacing.half,
  },
  filterSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small - Spacing.half,
  },
  filterSegmentFixed: {
    flexShrink: 0,
  },
  filterSegmentShrinkable: {
    flexShrink: 1,
    minWidth: 0,
  },
  filterSegmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    flexShrink: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    flexShrink: 0,
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
  listRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listRowDate: {
    fontWeight: '600',
  },
  shiftBadge: {
    flexShrink: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
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
    gap: Spacing.half,
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
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dialogTitle: {
    flexShrink: 1,
  },
  dialogShiftTypePill: {
    flexShrink: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
  },
  dialogShiftTypeLabel: {
    fontWeight: '700',
  },
  dialogDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: Spacing.two,
  },
  dialogEarningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dialogEarningsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  optionCard: {
    paddingVertical: 0,
  },
  optionScroll: {
    maxHeight: 360,
  },
  dialogOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  optionLabel: {
    flexShrink: 1,
  },
  ad: {
    marginTop: Spacing.two,
  },
});
