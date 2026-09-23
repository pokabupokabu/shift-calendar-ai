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
  return {
    shiftTypeLabel: first.shiftType ? `${first.shiftType}${suffix}` : undefined,
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
  const days = useGridDays(month);

  return (
    <View>
      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>
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
                <ThemedText type="small" themeColor="textSecondary" style={styles.adjacentDayText}>
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
          // 移動祝日・秋分/春分は日付計算が複雑なため holiday_jp に判定を委譲する。
          const isDangerDay = weekday === 0 || weekday === 6 || holiday_jp.isHoliday(day);

          return (
            <Pressable
              key={dateKey}
              style={[
                styles.cell,
                styles.dayCell,
                { borderColor: theme.border },
                { backgroundColor: selected ? theme.backgroundSelected : 'transparent' },
                today && !selected && { borderColor: theme.primary },
              ]}
              onPress={() => onSelectDate(dateKey)}
            >
              <View style={styles.dateRow}>
                <ThemedText
                  type="small"
                  themeColor={today ? 'primary' : isDangerDay ? 'danger' : 'text'}
                  style={styles.dateNumber}
                >
                  {format(day, 'd')}
                </ThemedText>
                {dayLabel?.shiftTypeLabel && (
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.shiftTypeLabel}
                    numberOfLines={1}
                  >
                    {dayLabel.shiftTypeLabel}
                  </ThemedText>
                )}
              </View>
              {dayLabel && (
                <View style={styles.timeBlock}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.timeLabel}>
                    {dayLabel.startTime}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.timeLabel}>
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
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  dayCell: {
    minHeight: 76,
    alignItems: 'flex-start',
    borderRadius: Radius.small,
    borderWidth: 1,
    overflow: 'hidden',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  adjacentDayCell: {
    opacity: 0.4,
  },
  adjacentDayText: {
    width: '100%',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
    width: '100%',
  },
  dateNumber: {
    flexShrink: 0,
  },
  shiftTypeLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
  },
  timeBlock: {
    width: '100%',
  },
  timeLabel: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'left',
  },
});
