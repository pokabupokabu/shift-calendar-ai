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
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import type { CalendarEventRecord } from '@/models';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export interface MonthGridProps {
  month: Date;
  eventsByDate: Record<string, CalendarEventRecord[]>;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

interface DayLabel {
  shiftTypeLabel?: string;
  startTime: string;
  endTime: string;
  suffix: string;
}

function toDayLabel(events: CalendarEventRecord[]): DayLabel | undefined {
  const [first, ...rest] = events;
  if (!first) return undefined;

  const suffix = rest.length > 0 ? ` +${rest.length}` : '';
  const shiftTypeInitial = first.shiftType ? (Array.from(first.shiftType)[0] ?? '') : '';
  return {
    shiftTypeLabel: first.shiftType ? `${shiftTypeInitial}${suffix}` : undefined,
    startTime: first.startTime,
    endTime: first.endTime,
    suffix: first.shiftType ? '' : suffix,
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

export function MonthGrid({ month, eventsByDate, selectedDate, onSelectDate }: MonthGridProps) {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const days = useGridDays(month);

  return (
    <View>
      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label, index) => {
          const weekdayColor = index === 0 ? 'danger' : index === 6 ? 'primary' : 'textSecondary';
          return (
            <View key={label} style={styles.cell}>
              <ThemedText type="caption2" themeColor={weekdayColor}>
                {label}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <View
        style={[
          styles.gridCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <View style={styles.grid}>
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inCurrentMonth = isSameMonth(day, month);

            if (!inCurrentMonth) {
              return (
                <View
                  key={dateKey}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    styles.adjacentDayCell,
                    { borderColor: theme.border },
                  ]}
                >
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.adjacentDayText}
                  >
                    {format(day, 'd')}
                  </ThemedText>
                </View>
              );
            }

            const dayEvents = eventsByDate[dateKey];
            const dayLabel = dayEvents && dayEvents.length > 0 ? toDayLabel(dayEvents) : undefined;
            const selected = dateKey === selectedDate;
            const today = isToday(day);
            const weekday = getDay(day);
            const isSaturday = weekday === 6;
            // 移動祝日・秋分/春分は日付計算が複雑なため holiday_jp に判定を委譲する。
            const isSundayOrHoliday = weekday === 0 || holiday_jp.isHoliday(day);

            return (
              <Pressable
                key={dateKey}
                style={[
                  styles.cell,
                  styles.dayCell,
                  { borderColor: theme.border },
                  { backgroundColor: selected ? theme.backgroundSelected : 'transparent' },
                  today &&
                    !selected && {
                      borderColor: theme.primary,
                      borderWidth: 2,
                      backgroundColor: blueBadge.background,
                    },
                ]}
                onPress={() => onSelectDate(dateKey)}
              >
                <View style={styles.dateRow}>
                  <ThemedText
                    themeColor={
                      today
                        ? 'primary'
                        : isSundayOrHoliday
                          ? 'danger'
                          : isSaturday
                            ? 'primary'
                            : 'text'
                    }
                    style={styles.dateNumber}
                  >
                    {format(day, 'd')}
                  </ThemedText>
                  {dayLabel?.shiftTypeLabel && (
                    <ThemedText
                      themeColor="onPrimary"
                      style={[styles.shiftTypeLabel, { backgroundColor: theme.primary }]}
                      numberOfLines={1}
                    >
                      {dayLabel.shiftTypeLabel}
                    </ThemedText>
                  )}
                </View>
                {dayLabel && (
                  <View style={[styles.timeBlock, { backgroundColor: blueBadge.background }]}>
                    <ThemedText themeColor="primary" style={styles.timeLabel}>
                      {dayLabel.startTime}
                    </ThemedText>
                    <ThemedText themeColor="primary" style={styles.timeLabel}>
                      {dayLabel.endTime}
                      {dayLabel.suffix}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCard: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.half,
  },
  dayCell: {
    minHeight: 74,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  adjacentDayCell: {
    opacity: 0.3,
  },
  adjacentDayText: {
    width: '100%',
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
    width: '100%',
  },
  dateNumber: {
    flexShrink: 0,
    minWidth: 16,
    fontSize: 12,
    fontWeight: '700',
  },
  shiftTypeLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timeBlock: {
    width: '100%',
    borderRadius: 4,
    paddingVertical: 2,
  },
  timeLabel: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
});
