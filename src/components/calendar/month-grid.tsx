import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import holiday_jp from '@holiday-jp/holiday_jp';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadgeTones, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import type { CalendarEventRecord, Workplace } from '@/models';
import { useAppStore } from '@/store/useAppStore';
import { ALL_DAY_LABEL } from '@/utils/formatShift';
import { resolveShiftTypeTone } from '@/utils/resolveShiftTypeTone';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 表のカードの枠線の太さ。曜日の見出しの左右をマスの列に揃えるためにも使う。 */
const GRID_CARD_BORDER_WIDTH = 1;
/** 高さに合わせて伸ばさないときの1週ぶんの行の高さ（今は使う画面が無い）。 */
const FIXED_WEEK_ROW_MIN_HEIGHT = 74;
/**
 * 高さに合わせて伸ばすときの1週ぶんの行の最低の高さ。マスの中身がちょうど収まる高さ:
 * 上下の内側余白 2+2 ＋ 日付の行 16 ＋ すき間 2 ＋ 時刻の欄 26（11pt×2行＋上下1）＝ 48。
 * iPhone SE（375×667）で、広告の無いPROなら6週ある月でもスクロールせずに収まる値（calendar-view.tsx の説明を参照）。
 */
const FILL_WEEK_ROW_MIN_HEIGHT = 48;
/** マスの中の文字は幅に余裕が無いため、iPhoneの文字サイズ設定で大きくしない。 */
const CELL_TEXT_MAX_FONT_SCALE = 1;
/** マスの中のシフト名は先頭2文字まで（「早番」はそのまま、3文字以上は切り詰める。「…」は付けない）。 */
const SHIFT_NAME_MAX_CHARS = 2;

export interface MonthGridProps {
  month: Date;
  eventsByDate: Record<string, CalendarEventRecord[]>;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  /**
   * true のとき、親（ScrollView の中身）の空いている高さいっぱいまで週の行を均等に伸ばす。
   * カレンダーのタブの月表示で使う（2026-10-27 から無料・PROとも）。親が flexGrow で高さを渡している前提。
   */
  fillAvailableHeight?: boolean;
}

interface DayLabel {
  shiftTypeName?: string;
  startTime: string;
  endTime: string;
  /** 同じ日の2件目以降の件数。0なら「+N」を出さない。 */
  extraCount: number;
  /** 終日シフトは時刻を持たないため、時刻の代わりに「終日」と出す。 */
  isAllDay: boolean;
}

function toDayLabel(events: CalendarEventRecord[]): DayLabel | undefined {
  const [first, ...rest] = events;
  if (!first) return undefined;

  return {
    shiftTypeName: first.shiftType
      ? Array.from(first.shiftType).slice(0, SHIFT_NAME_MAX_CHARS).join('')
      : undefined,
    startTime: first.startTime,
    endTime: first.endTime,
    extraCount: rest.length,
    isAllDay: !!first.isAllDay,
  };
}

/** 前後月の日を含めて、必ず7の倍数（フルの週の並び）で埋めた1ヶ月分の日付一覧を返す。 */
function useGridDays(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const leadingOffset = getDay(monthStart);

  const leadingDays =
    leadingOffset === 0
      ? []
      : eachDayOfInterval({
          start: subDays(endOfMonth(subMonths(month, 1)), leadingOffset - 1),
          end: endOfMonth(subMonths(month, 1)),
        });

  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const trailingCount = (7 - ((leadingDays.length + monthDays.length) % 7)) % 7;
  const nextMonthStart = startOfMonth(addMonths(month, 1));
  const trailingDays =
    trailingCount === 0
      ? []
      : eachDayOfInterval({
          start: nextMonthStart,
          end: addDays(nextMonthStart, trailingCount - 1),
        });

  return [...leadingDays, ...monthDays, ...trailingDays];
}

function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function resolveDayTone(
  workplaces: Workplace[] | undefined,
  events: CalendarEventRecord[],
): IconBadgeTone {
  const [first] = events;
  if (!workplaces || !first) return 'blue';
  return resolveShiftTypeTone(workplaces, first.workplaceId, first.shiftType);
}

export function MonthGrid({
  month,
  eventsByDate,
  selectedDate,
  onSelectDate,
  fillAvailableHeight = false,
}: MonthGridProps) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const blueBadge = useIconBadgeColors('blue');
  const workplaces = useAppStore((state) => state.user?.workplaces);
  const weeks = chunkWeeks(useGridDays(month));

  const renderDay = (day: Date, columnIndex: number) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const columnDivider = columnIndex > 0 && [
      styles.columnDivider,
      { borderLeftColor: theme.border },
    ];

    if (!isSameMonth(day, month)) {
      return (
        <View key={dateKey} style={[styles.dayCell, columnDivider]}>
          <View style={styles.dateRow}>
            <View style={styles.dateBadge}>
              <ThemedText
                type="caption1"
                themeColor="textSecondary"
                maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
                style={[styles.dateNumber, styles.adjacentDateNumber]}
              >
                {format(day, 'd')}
              </ThemedText>
            </View>
          </View>
        </View>
      );
    }

    const dayEvents = eventsByDate[dateKey];
    const hasEvents = !!dayEvents && dayEvents.length > 0;
    const dayLabel = hasEvents ? toDayLabel(dayEvents) : undefined;
    const dayTone = hasEvents ? resolveDayTone(workplaces, dayEvents) : 'blue';
    const dayBadge = IconBadgeTones[colorScheme][dayTone];
    const selected = dateKey === selectedDate;
    const today = isToday(day);
    const weekday = getDay(day);
    const isSaturday = weekday === 6;
    // 移動祝日・秋分/春分は日付計算が複雑なため holiday_jp に判定を委譲する。
    const isSundayOrHoliday = weekday === 0 || holiday_jp.isHoliday(day);
    const dateColor = today
      ? theme.onPrimary
      : isSundayOrHoliday
        ? theme.danger
        : isSaturday
          ? theme.primary
          : theme.text;

    return (
      <Pressable
        key={dateKey}
        style={[
          styles.dayCell,
          columnDivider,
          {
            backgroundColor: selected
              ? theme.backgroundSelected
              : today
                ? blueBadge.background
                : 'transparent',
          },
        ]}
        onPress={() => onSelectDate(dateKey)}
      >
        <View style={styles.dateRow}>
          {/* 今日は青い丸に白い数字（iPhone標準カレンダーと同じ表し方） */}
          <View style={[styles.dateBadge, today && { backgroundColor: theme.primary }]}>
            <ThemedText
              type="caption1"
              maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
              style={[styles.dateNumber, { color: dateColor }]}
            >
              {format(day, 'd')}
            </ThemedText>
          </View>
          {dayLabel?.shiftTypeName && (
            <ThemedText
              type="caption2"
              maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
              style={[styles.shiftTypeName, { color: dayBadge.icon }]}
            >
              {dayLabel.shiftTypeName}
            </ThemedText>
          )}
        </View>
        {dayLabel && (
          <View style={[styles.timeBlock, { backgroundColor: dayBadge.background }]}>
            {dayLabel.isAllDay ? (
              <ThemedText
                type="caption2"
                maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
                style={[styles.timeLabel, { color: dayBadge.icon }]}
              >
                {ALL_DAY_LABEL}
              </ThemedText>
            ) : (
              <>
                <ThemedText
                  type="caption2"
                  maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
                  style={[styles.timeLabel, { color: dayBadge.icon }]}
                >
                  {dayLabel.startTime}
                </ThemedText>
                <ThemedText
                  type="caption2"
                  maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
                  style={[styles.timeLabel, { color: dayBadge.icon }]}
                >
                  {dayLabel.endTime}
                </ThemedText>
              </>
            )}
          </View>
        )}
        {dayLabel && dayLabel.extraCount > 0 && (
          <ThemedText
            type="caption2"
            maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
            style={[styles.extraCount, { color: dayBadge.icon }]}
          >
            +{dayLabel.extraCount}
          </ThemedText>
        )}
      </Pressable>
    );
  };

  return (
    <View style={fillAvailableHeight && styles.fill}>
      <View style={styles.weekdayHeader}>
        {WEEKDAY_LABELS.map((label, index) => {
          const weekdayColor = index === 0 ? 'danger' : index === 6 ? 'primary' : 'textSecondary';
          return (
            <ThemedText
              key={label}
              type="caption2"
              themeColor={weekdayColor}
              maxFontSizeMultiplier={CELL_TEXT_MAX_FONT_SCALE}
              style={styles.weekdayLabel}
            >
              {label}
            </ThemedText>
          );
        })}
      </View>
      <View
        style={[
          styles.gridCard,
          fillAvailableHeight && styles.fill,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        {/* 角のマスの地の色（今日・選択中）がカードの角丸からはみ出さないよう、内側で切り取る */}
        <View style={[styles.gridClip, fillAvailableHeight && styles.fill]}>
          {weeks.map((week, rowIndex) => (
            <View
              key={format(week[0], 'yyyy-MM-dd')}
              style={[
                styles.weekRow,
                fillAvailableHeight ? styles.fillWeekRow : styles.fixedWeekRow,
                rowIndex > 0 && [styles.rowDivider, { borderTopColor: theme.border }],
              ]}
            >
              {week.map(renderDay)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flexGrow: 1,
  },
  weekdayHeader: {
    flexDirection: 'row',
    // マスの列と揃えるため、表のカードの枠線＋内側余白のぶんだけ内側に寄せる。
    paddingHorizontal: GRID_CARD_BORDER_WIDTH + Spacing.half,
    paddingBottom: Spacing.half,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
  },
  gridCard: {
    borderRadius: Radius.medium,
    borderWidth: GRID_CARD_BORDER_WIDTH,
    padding: Spacing.half,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridClip: {
    borderRadius: Radius.smallLarge,
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
  },
  fixedWeekRow: {
    minHeight: FIXED_WEEK_ROW_MIN_HEIGHT,
  },
  fillWeekRow: {
    // flexBasis は auto のまま伸ばすので、中身（「+1」のある日など）より低くはならない。
    flexGrow: 1,
    minHeight: FILL_WEEK_ROW_MIN_HEIGHT,
  },
  // iPhone標準カレンダーのように、マス同士は細い線だけで区切る（1日ずつの枠は付けない）。
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  columnDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    gap: Spacing.half,
    padding: Spacing.half,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    height: 16,
  },
  dateBadge: {
    // 今日の青い丸が2桁の数字でも窮屈にならないよう18にし、上下の-1で行の高さ（16）は変えない。
    width: 18,
    height: 18,
    marginVertical: -1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontWeight: '700',
  },
  adjacentDateNumber: {
    opacity: 0.3,
  },
  shiftTypeName: {
    flexShrink: 0,
  },
  timeBlock: {
    width: '100%',
    borderRadius: 4,
    paddingVertical: 1,
  },
  // caption2（11pt・600）の行間13を12に詰める（2行で26に収め、行の最低の高さ48を守るため）
  timeLabel: {
    lineHeight: 12,
    textAlign: 'center',
  },
  extraCount: {
    width: '100%',
    textAlign: 'center',
  },
});
