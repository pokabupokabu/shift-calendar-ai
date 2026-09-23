import { eachDayOfInterval, endOfMonth, format, getDay, isToday, startOfMonth } from 'date-fns';
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
  badge?: string;
  time: string;
}

function toCompactTimeRange(startTime: string, endTime: string): string {
  return `${parseInt(startTime, 10)}-${parseInt(endTime, 10)}`;
}

function toDayLabel(events: CalendarEventRecord[]): DayLabel | undefined {
  const [first, ...rest] = events;
  if (!first) return undefined;

  const suffix = rest.length > 0 ? ` +${rest.length}` : '';
  const time = toCompactTimeRange(first.startTime, first.endTime);
  return {
    badge: first.shiftType ? `${first.shiftType}${suffix}` : undefined,
    time: first.shiftType ? time : `${time}${suffix}`,
  };
}

export function MonthGrid({ month, eventsByDate, selectedDate, onSelectDate }: MonthGridProps) {
  const theme = useTheme();
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  // 月初の曜日オフセット分だけ空セルを挿入し、日付を正しい曜日列に揃える。
  const leadingOffset = getDay(startOfMonth(month));
  const leadingCells = Array.from({ length: leadingOffset });

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
        {leadingCells.map((_, index) => (
          <View key={`leading-${index}`} style={styles.cell} />
        ))}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
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
                { backgroundColor: selected ? theme.backgroundSelected : 'transparent' },
                today && !selected && { borderColor: theme.primary, borderWidth: 1 },
              ]}
              onPress={() => onSelectDate(dateKey)}
            >
              <View style={styles.dateRow}>
                <ThemedText
                  type="small"
                  themeColor={today ? 'primary' : isDangerDay ? 'danger' : 'text'}
                >
                  {format(day, 'd')}
                </ThemedText>
                {dayLabel?.badge && (
                  <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="small" style={styles.badgeText} numberOfLines={1}>
                      {dayLabel.badge}
                    </ThemedText>
                  </View>
                )}
              </View>
              {dayLabel && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.timeLabel}
                  numberOfLines={1}
                >
                  {dayLabel.time}
                </ThemedText>
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
    minHeight: 68,
    borderRadius: Radius.small,
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
});
