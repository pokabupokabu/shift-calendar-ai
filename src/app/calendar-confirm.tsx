import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Shift, ShiftRegistrationStatus } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { classifyShift } from '@/utils/classifyShifts';
import { deferNavigation } from '@/utils/deferNavigation';
import { buildEventTitle } from '@/utils/eventTitle';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';

const DATE_FORMAT = 'yyyy-MM-dd';

const STATUS_LABEL: Record<ShiftRegistrationStatus, string> = {
  new: '新規',
  overwrite: '上書き',
  needs_review: '要確認',
};

const PHOTO_HEIGHT = 220;

interface ClassifiedShift {
  shift: Shift;
  status: ShiftRegistrationStatus;
}

/**
 * 抽出結果の目視確認とカレンダー登録確認を兼ねる画面 (旧shift-results.tsx廃止に伴い統合)。
 * 選択式ではなく、個別編集(/shift-review)・削除(消)・全復元(元に戻す)・追加(日付を追加)で
 * 登録対象を調整してから一括登録する (requirements section 11, 12)。
 */
export default function CalendarConfirmScreen() {
  const theme = useTheme();
  const images = useShiftSessionStore((state) => state.images);
  const shifts = useShiftSessionStore((state) => state.shifts);
  const removedShiftIds = useShiftSessionStore((state) => state.removedShiftIds);
  const addShift = useShiftSessionStore((state) => state.addShift);
  const removeShift = useShiftSessionStore((state) => state.removeShift);
  const restoreAllShifts = useShiftSessionStore((state) => state.restoreAllShifts);
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const settings = useAppStore((state) => state.user?.settings);
  const recordCalendarEvent = useAppStore((state) => state.recordCalendarEvent);
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);

  const photoUri = images[0]?.uri;
  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const [registering, setRegistering] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Pick<Shift, 'date' | 'startTime' | 'endTime' | 'shiftType'>>({
    date: format(new Date(), DATE_FORMAT),
    startTime: '09:00',
    endTime: '18:00',
    shiftType: '',
  });

  const openAddDialog = () => {
    setDraft({
      date: format(new Date(), DATE_FORMAT),
      startTime: '09:00',
      endTime: '18:00',
      shiftType: '',
    });
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = () => {
    addShift({ ...draft, isOvernight: draft.endTime <= draft.startTime });
    setAddDialogOpen(false);
  };

  const visible: ClassifiedShift[] = useMemo(
    () =>
      shifts
        .filter((shift) => !removedShiftIds.includes(shift.id))
        .map((shift) => ({ shift, status: classifyShift(shift, calendarEvents) })),
    [shifts, removedShiftIds, calendarEvents],
  );

  const counts = visible.reduce((acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }), {
    new: 0,
    overwrite: 0,
    needs_review: 0,
  } as Record<ShiftRegistrationStatus, number>);

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
      for (const { shift, status } of visible) {
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
          updateCalendarEvent(existing.id, {
            ...input,
            shiftId: shift.id,
            shiftType: shift.shiftType,
          });
        } else {
          const record = await provider.createEvent(input);
          recordCalendarEvent({ ...record, shiftId: shift.id, shiftType: shift.shiftType });
        }
        successCount += 1;
      }
      deferNavigation(() =>
        router.replace({ pathname: '/complete', params: { count: String(successCount) } }),
      );
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

      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />}

      <View style={styles.summaryRow}>
        <ThemedText themeColor="textSecondary">
          新規：{counts.new}件　上書き：{counts.overwrite}件　要確認：{counts.needs_review}件
        </ThemedText>
        {removedShiftIds.length > 0 && (
          <Pressable onPress={restoreAllShifts}>
            <ThemedText type="link">元に戻す</ThemedText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.shift.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card
            onPress={() =>
              router.push({ pathname: '/shift-review', params: { id: item.shift.id } })
            }
            style={styles.card}
          >
            <View style={styles.cardText}>
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
            <View style={styles.cardActions}>
              <ThemedText type="smallBold">{STATUS_LABEL[item.status]}</ThemedText>
              <Pressable onPress={() => removeShift(item.shift.id)} hitSlop={Spacing.two}>
                <ThemedText themeColor="danger">消</ThemedText>
              </Pressable>
            </View>
          </Card>
        )}
      />

      <Pressable onPress={openAddDialog} style={styles.addButton}>
        <ThemedText type="link">＋ 日付を追加</ThemedText>
      </Pressable>

      <PrimaryButton
        label={registering ? '登録中…' : `カレンダーに登録（${visible.length}件）`}
        onPress={handleRegister}
        disabled={registering || visible.length === 0}
      />

      <Dialog visible={isAddDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <ThemedText type="smallBold">日付を追加</ThemedText>

        {shiftTypes.length > 0 && (
          <View style={styles.templateBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              テンプレートから入力
            </ThemedText>
            <View style={styles.templateRow}>
              {shiftTypes.map((shiftType) => (
                <Pressable
                  key={shiftType.id}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      shiftType: shiftType.name,
                      startTime: shiftType.startTime,
                      endTime: shiftType.endTime,
                    }))
                  }
                  style={[styles.templateChip, { backgroundColor: theme.backgroundElement }]}
                >
                  <ThemedText type="small">{shiftType.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View>
          <ThemedText type="small">日付</ThemedText>
          <TextInput
            value={draft.date}
            onChangeText={(date) => setDraft((current) => ({ ...current, date }))}
            placeholder="YYYY-MM-DD"
            style={inputStyle}
          />
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <ThemedText type="small">開始時刻</ThemedText>
            <TextInput
              value={draft.startTime}
              onChangeText={(startTime) => setDraft((current) => ({ ...current, startTime }))}
              placeholder="HH:mm"
              style={inputStyle}
            />
          </View>
          <View style={styles.timeField}>
            <ThemedText type="small">終了時刻</ThemedText>
            <TextInput
              value={draft.endTime}
              onChangeText={(endTime) => setDraft((current) => ({ ...current, endTime }))}
              placeholder="HH:mm"
              style={inputStyle}
            />
          </View>
        </View>

        <View style={styles.dialogActions}>
          <Pressable onPress={() => setAddDialogOpen(false)} style={styles.dialogCancel}>
            <ThemedText themeColor="textSecondary">キャンセル</ThemedText>
          </Pressable>
          <PrimaryButton label="追加" onPress={handleConfirmAdd} />
        </View>
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
    borderRadius: Radius.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardText: {
    gap: Spacing.half,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  templateBlock: {
    gap: Spacing.two,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  templateChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timeField: {
    flex: 1,
    gap: Spacing.one,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dialogCancel: {
    padding: Spacing.two,
  },
});
