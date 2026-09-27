import { isSameMonth, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import type { CalendarEventRecord } from '@/models';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';

export interface MonthListProps {
  month: Date;
  eventsByDate: Record<string, CalendarEventRecord[]>;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
}

/** カレンダータブの「リスト」表示: その月にシフトがある日だけを日付順に縦一列で並べる。 */
export function MonthList({ month, eventsByDate, selectedDate, onSelectDate }: MonthListProps) {
  const blueBadge = useIconBadgeColors('blue');

  const dateKeys = Object.keys(eventsByDate)
    .filter((dateKey) => eventsByDate[dateKey].length > 0 && isSameMonth(parseISO(dateKey), month))
    .sort();

  if (dateKeys.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <ThemedText type="small" themeColor="textSecondary">
          この月のシフトはまだありません
        </ThemedText>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {dateKeys.map((dateKey) => {
        const events = eventsByDate[dateKey];
        const [first, ...rest] = events;
        const selected = dateKey === selectedDate;

        return (
          <Card
            key={dateKey}
            onPress={() => onSelectDate(dateKey)}
            selected={selected}
            style={styles.row}
          >
            <IconBadge tone="blue" size={32}>
              <CalendarDays size={IconSize.small} color={blueBadge.icon} />
            </IconBadge>
            <View style={styles.rowText}>
              <ThemedText type="headline">{formatShiftDate(dateKey)}</ThemedText>
              <ThemedText type="subheadline" themeColor="textSecondary" numberOfLines={1}>
                {first.shiftType ? `${first.shiftType}・` : ''}
                {formatShiftTimeRange(
                  first.startTime,
                  first.endTime,
                  first.endTime <= first.startTime,
                )}
                {rest.length > 0 ? `　他${rest.length}件` : ''}
              </ThemedText>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
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
  emptyCard: {
    alignItems: 'center',
  },
});
