import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Shift, ShiftRegistrationStatus } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { classifyShift } from '@/utils/classifyShifts';
import { buildEventTitle } from '@/utils/eventTitle';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';

const STATUS_LABEL: Record<ShiftRegistrationStatus, string> = {
  new: '新規',
  overwrite: '上書き',
  needs_review: '要確認',
};

interface ClassifiedShift {
  shift: Shift;
  status: ShiftRegistrationStatus;
}

/** カレンダー登録確認画面: 新規・上書き・要確認の3分類と個別/全選択 (requirements section 11, 12). */
export default function CalendarConfirmScreen() {
  const theme = useTheme();
  const shifts = useShiftSessionStore((state) => state.shifts);
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const settings = useAppStore((state) => state.user?.settings);
  const recordCalendarEvent = useAppStore((state) => state.recordCalendarEvent);
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);

  const classified: ClassifiedShift[] = useMemo(
    () => shifts.map((shift) => ({ shift, status: classifyShift(shift, calendarEvents) })),
    [shifts, calendarEvents],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(shifts.map((s) => s.id)),
  );
  const [registering, setRegistering] = useState(false);

  const counts = classified.reduce(
    (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
    { new: 0, overwrite: 0, needs_review: 0 } as Record<ShiftRegistrationStatus, number>,
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.size === shifts.length ? new Set() : new Set(shifts.map((s) => s.id)),
    );
  };

  const handleRegister = async () => {
    if (!settings) return;
    const provider = getCalendarProvider(settings.defaultCalendarProvider);

    if (provider.requiresAuthentication && !(await provider.isAuthenticated())) {
      try {
        await provider.authenticate();
      } catch (error) {
        Alert.alert('Google認証に失敗しました', error instanceof Error ? error.message : undefined);
        return;
      }
    }

    const permitted = await provider.requestCalendarPermission();
    if (!permitted) {
      Alert.alert('カレンダーへのアクセスが許可されていません', '設定アプリから許可してください。');
      return;
    }

    setRegistering(true);
    let successCount = 0;
    try {
      for (const { shift, status } of classified) {
        if (!selectedIds.has(shift.id)) continue;
        const title = buildEventTitle(settings.eventTitleTemplate, shift.shiftType);
        const input = {
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          title,
        };
        const existing =
          status === 'overwrite' ? calendarEvents.find((e) => e.date === shift.date) : undefined;

        if (existing) {
          await provider.updateEvent(existing.externalEventId, input);
          updateCalendarEvent(existing.id, { ...input, shiftId: shift.id });
        } else {
          const record = await provider.createEvent(input);
          recordCalendarEvent({ ...record, shiftId: shift.id });
        }
        successCount += 1;
      }
      router.replace({ pathname: '/complete', params: { count: String(successCount) } });
    } catch (error) {
      Alert.alert(
        'カレンダーへの登録に失敗しました',
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="subtitle">登録内容の確認</ThemedText>
      <ThemedText themeColor="textSecondary">
        新規：{counts.new}件　上書き：{counts.overwrite}件　要確認：{counts.needs_review}件
      </ThemedText>

      <Pressable onPress={toggleAll}>
        <ThemedText type="link">
          {selectedIds.size === shifts.length ? 'すべて選択解除' : 'すべて選択'}
        </ThemedText>
      </Pressable>

      <FlatList
        data={classified}
        keyExtractor={(item) => item.shift.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggle(item.shift.id)}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.rowText}>
              <ThemedText type="smallBold">
                {formatShiftDate(item.shift.date)} {item.shift.shiftType}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {formatShiftTimeRange(
                  item.shift.startTime,
                  item.shift.endTime,
                  item.shift.isOvernight,
                )}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              {selectedIds.has(item.shift.id) ? '✓ ' : ''}
              {STATUS_LABEL[item.status]}
            </ThemedText>
          </Pressable>
        )}
      />

      <PrimaryButton
        label={registering ? '登録中…' : `カレンダーに登録（${selectedIds.size}件）`}
        onPress={handleRegister}
        disabled={registering || selectedIds.size === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: {
    gap: Spacing.half,
  },
});
