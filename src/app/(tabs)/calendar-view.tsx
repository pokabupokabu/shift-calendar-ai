import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { MonthGrid } from '@/components/calendar/month-grid';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';
import type { CalendarEventRecord } from '@/models';

export default function CalendarViewTab() {
  const theme = useTheme();
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const provider = useAppStore((state) => state.user?.settings.defaultCalendarProvider ?? 'apple');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const handleOpenCalendar = async () => {
    await getCalendarProvider(provider).openCalendarApp();
  };

  const eventsByDate = useMemo(() => {
    return calendarEvents.reduce<Record<string, CalendarEventRecord[]>>((acc, event) => {
      const list = acc[event.date] ?? [];
      list.push(event);
      acc[event.date] = list;
      return acc;
    }, {});
  }, [calendarEvents]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  return (
    <Screen>
      <ThemedText type="subtitle">カレンダー</ThemedText>

      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} hitSlop={Spacing.two}>
          <ChevronLeft size={IconSize.medium} color={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">{label}</ThemedText>
        <Pressable onPress={goToNextMonth} hitSlop={Spacing.two}>
          <ChevronRight size={IconSize.medium} color={theme.text} />
        </Pressable>
      </View>

      <PrimaryButton label="カレンダーを見に行く" onPress={handleOpenCalendar} />

      <MonthGrid
        month={month}
        eventsByDate={eventsByDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <ScrollView contentContainerStyle={styles.listContent}>
        {selectedDate === undefined ? (
          <ThemedText type="small" themeColor="textSecondary">
            日付を選択するとシフトが表示されます
          </ThemedText>
        ) : selectedEvents.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            この日のシフトは登録されていません
          </ThemedText>
        ) : (
          selectedEvents.map((event) => (
            <Card key={event.id} style={styles.eventCard}>
              <ThemedText type="smallBold">{formatShiftDate(event.date)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatShiftTimeRange(event.startTime, event.endTime, false)}
              </ThemedText>
              {event.shiftType ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {event.shiftType}
                </ThemedText>
              ) : null}
            </Card>
          ))
        )}

        <AdPlaceholder slot="calendar-view" style={styles.ad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset,
  },
  eventCard: {
    gap: Spacing.half,
  },
  ad: {
    marginTop: Spacing.three,
  },
});
