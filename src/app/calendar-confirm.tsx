import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import type { Shift, ShiftRegistrationStatus } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { ensureCalendarAccess } from '@/services/calendar/ensureCalendarAccess';
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

const STATUS_COLOR: Record<ShiftRegistrationStatus, ThemeColor> = {
  new: 'textSecondary',
  overwrite: 'primary',
  needs_review: 'danger',
};

const PHOTO_HEIGHT = 120;

interface ClassifiedShift {
  shift: Shift;
  status: ShiftRegistrationStatus;
}

/**
 * 抽出結果の目視確認とカレンダー登録確認を兼ねる画面 (旧shift-results.tsx廃止に伴い統合)。
 * 選択式ではなく、個別編集(/shift-review)・削除(ゴミ箱アイコン)・全復元(元に戻す)・追加(日付を追加)で
 * 登録対象を調整してから一括登録する (requirements section 11, 12)。
 */
export default function CalendarConfirmScreen() {
  const theme = useTheme();
  const badgeColors = useIconBadgeColors('blue');
  const images = useShiftSessionStore((state) => state.images);
  const shifts = useShiftSessionStore((state) => state.shifts);
  const removedShiftIds = useShiftSessionStore((state) => state.removedShiftIds);
  const addShift = useShiftSessionStore((state) => state.addShift);
  const removeShift = useShiftSessionStore((state) => state.removeShift);
  const restoreAllShifts = useShiftSessionStore((state) => state.restoreAllShifts);
  const user = useAppStore((state) => state.user);
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ?? user?.workplaces[0];
  const shiftTypes = activeWorkplace?.shiftTypes ?? [];
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const settings = activeWorkplace?.settings;
  const recordCalendarEvent = useAppStore((state) => state.recordCalendarEvent);
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);

  const photoUri = images[0]?.uri;
  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
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
    addShift(
      { ...draft, isOvernight: draft.endTime <= draft.startTime },
      activeWorkplace?.id ?? '',
    );
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

  const monthLabel = format(visible[0] ? parseISO(visible[0].shift.date) : new Date(), 'yyyy年M月');

  const handleRegister = async () => {
    if (!settings || !activeWorkplace) return;
    const provider = getCalendarProvider(settings.defaultCalendarProvider);
    if (!(await ensureCalendarAccess(provider))) return;

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
            workplaceId: activeWorkplace.id,
            shiftType: shift.shiftType,
          });
        } else {
          const record = await provider.createEvent(input);
          recordCalendarEvent({
            ...record,
            shiftId: shift.id,
            workplaceId: activeWorkplace.id,
            shiftType: shift.shiftType,
          });
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
      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.summaryHeaderRow}>
          <ThemedText type="subheadline" themeColor="textSecondary">
            {monthLabel}
          </ThemedText>
          <ThemedText type="headline">合計{visible.length}件</ThemedText>
        </View>
        <View style={[styles.breakdownRow, { borderTopColor: theme.border }]}>
          <ThemedText type="footnote" themeColor="textSecondary">
            新規 {counts.new}件
          </ThemedText>
          <ThemedText type="footnote" themeColor="primary">
            上書き {counts.overwrite}件
          </ThemedText>
          <ThemedText type="footnote" themeColor="danger">
            要確認 {counts.needs_review}件
          </ThemedText>
        </View>
      </View>

      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />}

      {removedShiftIds.length > 0 && (
        <Pressable onPress={restoreAllShifts} style={styles.restoreRow} hitSlop={Spacing.two}>
          <ThemedText type="footnote" themeColor="primary">
            元に戻す（{removedShiftIds.length}件）
          </ThemedText>
        </Pressable>
      )}

      <View style={styles.listHeaderRow}>
        <ThemedText type="caption1" themeColor="textSecondary" style={styles.listHeaderCaption}>
          抽出済みシフト一覧
        </ThemedText>
        <ThemedText type="caption1" themeColor="textSecondary">
          タップして編集
        </ThemedText>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.shift.id}
        style={[styles.listContainer, { backgroundColor: theme.backgroundElement }]}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
        )}
        renderItem={({ item }) => {
          const parsedDate = parseISO(item.shift.date);
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/shift-review', params: { id: item.shift.id } })
              }
              style={styles.row}
            >
              <View style={[styles.dayBadge, { backgroundColor: badgeColors.background }]}>
                <ThemedText type="caption2" themeColor="primary" style={styles.dayBadgeMonth}>
                  {format(parsedDate, 'M月')}
                </ThemedText>
                <ThemedText type="headline" themeColor="primary" style={styles.dayBadgeNum}>
                  {format(parsedDate, 'd')}
                </ThemedText>
              </View>
              <View style={styles.rowContent}>
                <View style={styles.dateTimeRow}>
                  <ThemedText type="headline" style={styles.dateText}>
                    {formatShiftDate(item.shift.date)}
                  </ThemedText>
                  <ThemedText type="body" themeColor="textSecondary" style={styles.timeText}>
                    {formatShiftTimeRange(
                      item.shift.startTime,
                      item.shift.endTime,
                      item.shift.isOvernight,
                    )}
                  </ThemedText>
                </View>
                <View style={styles.tagRow}>
                  {item.status === 'overwrite' && (
                    <View style={[styles.tag, { backgroundColor: badgeColors.background }]}>
                      <ThemedText type="caption2" themeColor="primary">
                        {item.shift.shiftType}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText type="caption1" themeColor={STATUS_COLOR[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => removeShift(item.shift.id)}
                hitSlop={Spacing.two}
                style={styles.deleteButton}
              >
                <Trash2 size={IconSize.small} color={theme.danger} />
              </Pressable>
              <ChevronRight size={20} color={theme.textSecondary} />
            </Pressable>
          );
        }}
      />

      <Pressable onPress={openAddDialog} style={styles.addButton}>
        <ThemedText type="headline" themeColor="primary">
          ＋ 日付を追加
        </ThemedText>
      </Pressable>

      <PrimaryButton
        label={registering ? '登録中…' : `カレンダーに登録（${visible.length}件）`}
        onPress={handleRegister}
        disabled={registering || visible.length === 0}
      />

      <Dialog visible={isAddDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <ThemedText type="headline" style={styles.dialogTitle}>
          日付を追加
        </ThemedText>

        {shiftTypes.length > 0 && (
          <View style={styles.templateBlock}>
            <ThemedText type="footnote" themeColor="textSecondary">
              テンプレートから入力
            </ThemedText>
            <View style={styles.templateRow}>
              {shiftTypes.map((shiftType) => {
                const selected = draft.shiftType === shiftType.name;
                return (
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
                    style={[
                      styles.templateChip,
                      {
                        backgroundColor: selected ? badgeColors.background : theme.background,
                      },
                    ]}
                  >
                    <ThemedText
                      type="footnote"
                      themeColor={selected ? 'primary' : 'text'}
                      style={styles.templateChipText}
                    >
                      {shiftType.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View>
          <ThemedText type="footnote" themeColor="textSecondary">
            日付
          </ThemedText>
          <TextInput
            value={draft.date}
            onChangeText={(date) => setDraft((current) => ({ ...current, date }))}
            placeholder="YYYY-MM-DD"
            style={inputStyle}
          />
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <ThemedText type="footnote" themeColor="textSecondary">
              開始時刻
            </ThemedText>
            <TextInput
              value={draft.startTime}
              onChangeText={(startTime) => setDraft((current) => ({ ...current, startTime }))}
              placeholder="HH:mm"
              style={inputStyle}
            />
          </View>
          <View style={styles.timeField}>
            <ThemedText type="footnote" themeColor="textSecondary">
              終了時刻
            </ThemedText>
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
            <ThemedText type="body" themeColor="textSecondary">
              キャンセル
            </ThemedText>
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
  summaryCard: {
    borderRadius: Radius.smallLarge,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  restoreRow: {
    alignSelf: 'flex-end',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  listHeaderCaption: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    borderRadius: Radius.smallLarge,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayBadgeMonth: {
    lineHeight: 12,
  },
  dayBadgeNum: {
    lineHeight: 20,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  dateText: {
    fontWeight: '700',
  },
  timeText: {
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  deleteButton: {
    padding: Spacing.one,
  },
  addButton: {
    alignSelf: 'center',
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
  templateChipText: {
    fontWeight: '600',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  input: {
    borderRadius: Radius.small,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    marginTop: Spacing.one,
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
