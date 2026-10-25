import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdvancedRescanRow } from '@/components/advanced-rescan-row';
import { DatePickerPanel, formatLongDate } from '@/components/calendar/date-picker-panel';
import { PickerChip } from '@/components/calendar/picker-chip';
import { TimePickerPanel } from '@/components/calendar/time-picker-panel';
import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { TourTarget } from '@/components/tour/tour-target';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useTourStepOnFocus } from '@/hooks/use-tour-step';
import { isShiftTypeRegistered, type Shift, type ShiftRegistrationStatus } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { ensureCalendarAccess } from '@/services/calendar/ensureCalendarAccess';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { useTourStore } from '@/store/useTourStore';
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

/** 「日付を追加」の小窓で、下に開いている回す選択の部品。 */
type AddPicker = 'date' | 'start' | 'end';

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
  useTourStepOnFocus('confirm');
  const theme = useTheme();
  const badgeColors = useIconBadgeColors('blue');
  const neutralColors = useIconBadgeColors('neutral');
  const images = useShiftSessionStore((state) => state.images);
  const shifts = useShiftSessionStore((state) => state.shifts);
  const removedShiftIds = useShiftSessionStore((state) => state.removedShiftIds);
  const addShift = useShiftSessionStore((state) => state.addShift);
  const removeShift = useShiftSessionStore((state) => state.removeShift);
  const restoreAllShifts = useShiftSessionStore((state) => state.restoreAllShifts);
  const user = useAppStore((state) => state.user);
  // 写真選択画面で選んだ勤務先を最優先で使う。ここを activeWorkplaceId にすると、
  // 掛け持ちユーザーが別の勤務先を選んでスキャンしても、時給もカレンダーも別の勤務先のものになる。
  const scanWorkplaceId = useShiftSessionStore((state) => state.scanWorkplaceId);
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === scanWorkplaceId) ??
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ??
    user?.workplaces[0];
  const shiftTypes = activeWorkplace?.shiftTypes ?? [];
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const settings = activeWorkplace?.settings;
  const recordCalendarEvent = useAppStore((state) => state.recordCalendarEvent);
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);

  const photoUri = images[0]?.uri;

  const [registering, setRegistering] = useState(false);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Pick<Shift, 'date' | 'startTime' | 'endTime' | 'shiftType'>>({
    date: format(new Date(), DATE_FORMAT),
    startTime: '09:00',
    endTime: '18:00',
    shiftType: '',
  });
  const [activePicker, setActivePicker] = useState<AddPicker | null>(null);
  const togglePicker = (picker: AddPicker) =>
    setActivePicker((current) => (current === picker ? null : picker));

  const openAddDialog = () => {
    setDraft({
      date: format(new Date(), DATE_FORMAT),
      startTime: '09:00',
      endTime: '18:00',
      shiftType: '',
    });
    setActivePicker(null);
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

  // 時刻が読み取れなかったシフトは終日として登録される。給与は計算できないため、
  // 0円として計上せずに「含めない」ことをこの画面で先に伝える（年収見込みを誤らせないため）。
  const allDayCount = visible.filter((item) => item.shift.isAllDay).length;

  const handleRegister = async () => {
    if (!settings || !activeWorkplace) return;
    const provider = getCalendarProvider(settings.defaultCalendarProvider);
    if (!(await ensureCalendarAccess(provider))) {
      // 案内中に許可を断られたら、先に進めないので出口の画面を出す
      if (useTourStore.getState().step) {
        router.push({ pathname: '/tour-exit', params: { reason: 'permission' } });
      }
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
          // 時刻が読み取れなかったシフトは終日イベントとして登録する（時刻を推測しない）。
          isAllDay: shift.isAllDay ?? false,
        };
        const existing =
          status === 'overwrite' ? calendarEvents.find((e) => e.date === shift.date) : undefined;

        if (existing) {
          // 上書きは「書き換え」ではなく「消して作り直す」。終日⇔時刻ありの行き来のように
          // イベントの種類そのものが変わる場合、書き換えでは正しく反映されないことがあるため。
          await provider.deleteEvent(existing.externalEventId);
          const record = await provider.createEvent(input);
          updateCalendarEvent(existing.id, {
            ...input,
            externalEventId: record.externalEventId,
            calendarProvider: record.calendarProvider,
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

  const activeTimeLabel = activePicker === 'end' ? '終了時刻' : '開始時刻';

  return (
    <Screen style={styles.screen}>
      {/* 画面全体を1本のスクロールにする（まとめ・写真・一覧が一緒に流れる。B2の決定4） */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {allDayCount > 0 && (
          <View style={[styles.noticeCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="footnote" themeColor="textSecondary">
              {allDayCount}
              件は時刻が読み取れなかったため「終日」で登録します。給与の見込み額には含まれません。タップして時間を入れると、通常のシフトとして計算に入ります。
            </ThemedText>
          </View>
        )}

        {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />}

        {!registering && (
          <AdvancedRescanRow discardNote="今の読み取り結果と、この画面で直した内容は消えます。" />
        )}

        {removedShiftIds.length > 0 && (
          <Pressable onPress={restoreAllShifts} style={styles.restoreRow} hitSlop={Spacing.two}>
            <ThemedText type="footnote" themeColor="primary">
              元に戻す（{removedShiftIds.length}件）
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <ThemedText type="caption1" themeColor="textSecondary" style={styles.listHeaderCaption}>
              抽出済みシフト一覧
            </ThemedText>
            <ThemedText type="caption1" themeColor="textSecondary">
              タップして編集
            </ThemedText>
          </View>

          {visible.length > 0 && (
            <View style={[styles.listCard, { backgroundColor: theme.backgroundElement }]}>
              {visible.map((item, index) => {
                // 「要確認」の行は薄い赤の地にして、一覧の中で目に留まるようにする（v1 の決定2）
                const isReview = item.status === 'needs_review';
                return (
                  <View key={item.shift.id}>
                    {index > 0 && (
                      <View style={[styles.separator, { backgroundColor: theme.border }]} />
                    )}
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/shift-review', params: { id: item.shift.id } })
                      }
                      style={({ pressed }) => [
                        styles.row,
                        isReview && { backgroundColor: theme.dangerSurface },
                        pressed && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <View style={styles.rowContent}>
                        {/* 1行目に日付と時刻を並べる（v1 の決定1） */}
                        <View style={styles.dateTimeRow}>
                          <ThemedText type="headline">
                            {formatShiftDate(item.shift.date)}
                          </ThemedText>
                          <ThemedText type="subheadline" themeColor="textSecondary">
                            {formatShiftTimeRange(
                              item.shift.startTime,
                              item.shift.endTime,
                              item.shift.isOvernight,
                              item.shift.isAllDay,
                            )}
                          </ThemedText>
                        </View>
                        <View style={styles.tagRow}>
                          {item.shift.isAllDay && (
                            <View
                              style={[styles.tag, { backgroundColor: neutralColors.background }]}
                            >
                              <ThemedText type="caption2" themeColor="textSecondary">
                                時刻なし
                              </ThemedText>
                            </View>
                          )}
                          {/* シフト種別の札は種別のある全部の行に出す（B2の決定6） */}
                          {item.shift.shiftType.trim().length > 0 && (
                            <View style={[styles.tag, { backgroundColor: badgeColors.background }]}>
                              <ThemedText type="caption2" themeColor="primary">
                                {item.shift.shiftType}
                              </ThemedText>
                            </View>
                          )}
                          <ThemedText
                            type="caption1"
                            themeColor={STATUS_COLOR[item.status]}
                            style={item.status !== 'new' && styles.statusEmphasis}
                          >
                            {STATUS_LABEL[item.status]}
                          </ThemedText>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${formatShiftDate(item.shift.date)}を削除`}
                        onPress={() => removeShift(item.shift.id)}
                        hitSlop={Spacing.one}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={IconSize.small} color={theme.danger} />
                      </Pressable>
                      <ChevronRight size={20} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Pressable onPress={openAddDialog} style={styles.addButton}>
          <ThemedText type="headline" themeColor="primary">
            ＋ 日付を追加
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* 登録のボタンだけは下に固定する（B2の決定4） */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TourTarget id="register-button">
          <PrimaryButton
            label={registering ? '登録中…' : `カレンダーに登録（${visible.length}件）`}
            onPress={handleRegister}
            disabled={registering || visible.length === 0}
            variant="bluePill"
          />
        </TourTarget>
      </View>

      {/* 日付・時刻の部品を開くと縦に長くなるので、画面を超えるときは小窓の中をスクロールさせる */}
      <Dialog visible={isAddDialogOpen} onClose={() => setAddDialogOpen(false)} scrollable>
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
                      // 時刻が未登録の種別は名前だけ入れ、時刻の欄は今の入力のまま残す
                      setDraft((current) =>
                        isShiftTypeRegistered(shiftType)
                          ? {
                              ...current,
                              shiftType: shiftType.name,
                              startTime: shiftType.startTime,
                              endTime: shiftType.endTime,
                            }
                          : { ...current, shiftType: shiftType.name },
                      )
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    // 選んでいない札も押せると分かるよう一覧の種別の札と同じ薄い青、選んだ札は青く塗る
                    style={({ pressed }) => [
                      styles.templateChip,
                      {
                        backgroundColor: selected ? theme.primary : badgeColors.background,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      type="footnote"
                      style={[
                        styles.templateChipText,
                        { color: selected ? theme.onPrimary : theme.primary },
                      ]}
                    >
                      {shiftType.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 日付・時刻は手入力をやめ、札を押して回して選ぶ（B2の決定7・v1 の決定3） */}
        <View style={[styles.formGroup, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.formRow}>
            <ThemedText type="body">日付</ThemedText>
            <PickerChip
              accessibilityName="日付"
              value={formatLongDate(draft.date)}
              active={activePicker === 'date'}
              onPress={() => togglePicker('date')}
              valueColor="primary"
            />
          </View>
          <View style={[styles.formDivider, { backgroundColor: theme.border }]} />
          <View style={styles.formRow}>
            <ThemedText type="body">勤務時間</ThemedText>
            <View style={styles.chipRow}>
              <PickerChip
                accessibilityName="開始時刻"
                value={draft.startTime}
                active={activePicker === 'start'}
                onPress={() => togglePicker('start')}
              />
              <ThemedText type="subheadline" themeColor="textSecondary">
                〜
              </ThemedText>
              <PickerChip
                accessibilityName="終了時刻"
                value={draft.endTime}
                active={activePicker === 'end'}
                onPress={() => togglePicker('end')}
              />
            </View>
          </View>

          {activePicker === 'date' && (
            <DatePickerPanel
              caption="日付を選択"
              value={draft.date}
              onChange={(date) => setDraft((current) => ({ ...current, date }))}
            />
          )}
          {(activePicker === 'start' || activePicker === 'end') && (
            <TimePickerPanel
              key={activePicker}
              caption={`${activeTimeLabel}を選択（15分刻み）`}
              value={activePicker === 'start' ? draft.startTime : draft.endTime}
              onChange={(value) =>
                setDraft((current) =>
                  activePicker === 'start'
                    ? { ...current, startTime: value }
                    : { ...current, endTime: value },
                )
              }
            />
          )}
        </View>

        <View style={styles.dialogActions}>
          <PrimaryButton label="追加" onPress={handleConfirmAdd} variant="bluePill" />
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddDialogOpen(false)}
            style={styles.dialogCancel}
          >
            <ThemedText type="body" themeColor="primary">
              キャンセル
            </ThemedText>
          </Pressable>
        </View>
      </Dialog>
    </Screen>
  );
}

/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    gap: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  noticeCard: {
    borderRadius: Radius.smallLarge,
    padding: Spacing.three,
  },
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
  listSection: {
    gap: Spacing.two,
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
  listCard: {
    borderRadius: Radius.smallLarge,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: 10,
  },
  rowContent: {
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: Spacing.two,
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
  statusEmphasis: {
    fontWeight: '600',
  },
  deleteButton: {
    width: MIN_TAP_HEIGHT - Spacing.two,
    height: MIN_TAP_HEIGHT - Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignSelf: 'center',
    minHeight: MIN_TAP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    // 長い種別名でも小窓の幅をはみ出さない
    maxWidth: '100%',
    minHeight: MIN_TAP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  templateChipText: {
    fontWeight: '600',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  formGroup: {
    borderRadius: Radius.medium,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dialogActions: {
    gap: Spacing.one,
  },
  dialogCancel: {
    minHeight: MIN_TAP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
