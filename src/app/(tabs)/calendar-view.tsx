import { isSameMonth, parseISO } from 'date-fns';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Coffee,
  Pencil,
  RefreshCw,
  Timer,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { MonthGrid } from '@/components/calendar/month-grid';
import { MonthList } from '@/components/calendar/month-list';
import { Dialog } from '@/components/dialog';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { DEFAULT_WORKPLACE_SETTINGS } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';
import { useAppStore } from '@/store/useAppStore';
import { computeShiftBreakdown } from '@/utils/computePayroll';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';
import type { CalendarEventRecord, CalendarProviderId } from '@/models';

type ViewMode = 'month' | 'list';

const CALENDAR_PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
};

function formatYen(amount: number): string {
  return `${Math.round(amount).toLocaleString('ja-JP')}円`;
}

function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100}`;
}

interface EditDraft {
  date: string;
  startTime: string;
  endTime: string;
}

export default function CalendarViewTab() {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const greenBadge = useIconBadgeColors('green');
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const workplaces = useAppStore((state) => state.user?.workplaces);
  const provider = useAppStore(
    (state) => state.user?.workplaces[0]?.settings.defaultCalendarProvider ?? 'apple',
  );
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);
  const removeCalendarEvent = useAppStore((state) => state.removeCalendarEvent);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [editingEventId, setEditingEventId] = useState<string | undefined>(undefined);
  const [editDraft, setEditDraft] = useState<EditDraft>({ date: '', startTime: '', endTime: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | undefined>(undefined);
  const [isOpeningCalendar, setIsOpeningCalendar] = useState(false);
  const [providerChoiceVisible, setProviderChoiceVisible] = useState(false);

  const handleOpenCalendar = async () => {
    if (isOpeningCalendar) return;
    setIsOpeningCalendar(true);
    try {
      const connectedProviders = await getConnectedProviders();
      if (connectedProviders.length > 1) {
        setProviderChoiceVisible(true);
        return;
      }
      const targetProvider = connectedProviders[0] ?? provider;
      await getCalendarProvider(targetProvider).openCalendarApp();
    } finally {
      setIsOpeningCalendar(false);
    }
  };

  const handleChooseProvider = async (chosenProvider: CalendarProviderId) => {
    setProviderChoiceVisible(false);
    await getCalendarProvider(chosenProvider).openCalendarApp();
  };

  const eventsByDate = useMemo(() => {
    return calendarEvents.reduce<Record<string, CalendarEventRecord[]>>((acc, event) => {
      const list = acc[event.date] ?? [];
      list.push(event);
      acc[event.date] = list;
      return acc;
    }, {});
  }, [calendarEvents]);

  const workedDaysCount = useMemo(
    () =>
      Object.keys(eventsByDate).filter(
        (dateKey) => eventsByDate[dateKey].length > 0 && isSameMonth(parseISO(dateKey), month),
      ).length,
    [eventsByDate, month],
  );

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  const resetDialogEditState = () => {
    setEditingEventId(undefined);
    setConfirmDeleteId(undefined);
  };

  const handleSelectDate = (date: string) => {
    resetDialogEditState();
    setSelectedDate(date);
  };

  const handleCloseDialog = () => {
    resetDialogEditState();
    setSelectedDate(undefined);
  };

  const startEdit = (event: CalendarEventRecord) => {
    setConfirmDeleteId(undefined);
    setEditingEventId(event.id);
    setEditDraft({ date: event.date, startTime: event.startTime, endTime: event.endTime });
  };

  const handleSaveEdit = (eventId: string) => {
    updateCalendarEvent(eventId, {
      date: editDraft.date,
      startTime: editDraft.startTime,
      endTime: editDraft.endTime,
    });
    setEditingEventId(undefined);
  };

  const handleConfirmDelete = (eventId: string) => {
    removeCalendarEvent(eventId);
    setConfirmDeleteId(undefined);
  };

  return (
    <Screen>
      <ThemedText type="subtitle">カレンダー</ThemedText>

      <View style={styles.statAndToggleRow}>
        <View style={[styles.statPill, { backgroundColor: blueBadge.background }]}>
          <ThemedText style={[styles.statPillLabel, { color: blueBadge.icon }]}>
            今月: {workedDaysCount}日勤務
          </ThemedText>
        </View>

        <View style={[styles.viewToggle, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setViewMode('month')}
            style={[
              styles.viewToggleOption,
              viewMode === 'month' && [
                styles.viewToggleOptionActive,
                { backgroundColor: theme.backgroundElement },
              ],
            ]}
          >
            <ThemedText
              style={[
                styles.viewToggleLabel,
                { color: viewMode === 'month' ? theme.text : theme.disabled },
              ]}
            >
              月
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[
              styles.viewToggleOption,
              viewMode === 'list' && [
                styles.viewToggleOptionActive,
                { backgroundColor: theme.backgroundElement },
              ],
            ]}
          >
            <ThemedText
              style={[
                styles.viewToggleLabel,
                { color: viewMode === 'list' ? theme.text : theme.disabled },
              ]}
            >
              リスト
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.header}>
        <Pressable
          onPress={goToPrevMonth}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: blueBadge.background },
          ]}
        >
          <ChevronLeft size={IconSize.medium} color={theme.primary} />
        </Pressable>
        <ThemedText style={styles.monthLabel}>{label}</ThemedText>
        <Pressable
          onPress={goToNextMonth}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { backgroundColor: blueBadge.background },
          ]}
        >
          <ChevronRight size={IconSize.medium} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {viewMode === 'month' ? (
          <MonthGrid
            month={month}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        ) : (
          <MonthList
            month={month}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        )}

        <Pressable
          onPress={handleOpenCalendar}
          disabled={isOpeningCalendar}
          style={({ pressed }) => [
            styles.goToCalendarButton,
            { backgroundColor: theme.text, opacity: pressed || isOpeningCalendar ? 0.85 : 1 },
          ]}
        >
          <ThemedText style={[styles.goToCalendarLabel, { color: theme.background }]}>
            カレンダーを見に行く
          </ThemedText>
          <ChevronRight size={IconSize.small} color={theme.background} />
        </Pressable>
        <AdPlaceholder slot="calendar-view" style={styles.ad} />
      </ScrollView>

      <Dialog visible={selectedDate !== undefined} onClose={handleCloseDialog}>
        {selectedDate && (
          <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.dialogHandle, { backgroundColor: theme.border }]} />
            <ThemedText style={styles.dialogDate}>{formatShiftDate(selectedDate)}</ThemedText>

            {selectedEvents.length === 0 ? (
              <ThemedText type="subheadline" themeColor="textSecondary">
                この日のシフトは登録されていません
              </ThemedText>
            ) : (
              selectedEvents.map((event) => {
                const isOvernight = event.endTime <= event.startTime;
                const workplaceSettings =
                  workplaces?.find((w) => w.id === event.workplaceId)?.settings ??
                  DEFAULT_WORKPLACE_SETTINGS;
                const breakdown = computeShiftBreakdown(
                  event.startTime,
                  event.endTime,
                  workplaceSettings.wageType,
                  workplaceSettings.hourlyWage,
                  workplaceSettings.dailyWage,
                  workplaceSettings.breakDeductionEnabled,
                  workplaceSettings.breakRules,
                  workplaceSettings.lateNightPremium,
                  workplaceSettings.earlyMorningPremium,
                );
                const isEditing = editingEventId === event.id;
                const isConfirmingDelete = confirmDeleteId === event.id;

                return (
                  <Card key={event.id} style={styles.eventCard}>
                    {event.shiftType ? (
                      <View
                        style={[styles.shiftTypePill, { backgroundColor: blueBadge.background }]}
                      >
                        <ThemedText style={[styles.shiftTypePillLabel, { color: blueBadge.icon }]}>
                          {event.shiftType}
                        </ThemedText>
                      </View>
                    ) : null}

                    {isEditing ? (
                      <View style={styles.editForm}>
                        <View>
                          <ThemedText type="small">日付</ThemedText>
                          <TextInput
                            value={editDraft.date}
                            onChangeText={(date) =>
                              setEditDraft((current) => ({ ...current, date }))
                            }
                            placeholder="YYYY-MM-DD"
                            style={[
                              styles.input,
                              { color: theme.text, backgroundColor: theme.background },
                            ]}
                          />
                        </View>
                        <View style={styles.timeRow}>
                          <View style={styles.timeField}>
                            <ThemedText type="small">開始時刻</ThemedText>
                            <TextInput
                              value={editDraft.startTime}
                              onChangeText={(startTime) =>
                                setEditDraft((current) => ({ ...current, startTime }))
                              }
                              placeholder="HH:mm"
                              style={[
                                styles.input,
                                { color: theme.text, backgroundColor: theme.background },
                              ]}
                            />
                          </View>
                          <View style={styles.timeField}>
                            <ThemedText type="small">終了時刻</ThemedText>
                            <TextInput
                              value={editDraft.endTime}
                              onChangeText={(endTime) =>
                                setEditDraft((current) => ({ ...current, endTime }))
                              }
                              placeholder="HH:mm"
                              style={[
                                styles.input,
                                { color: theme.text, backgroundColor: theme.background },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.editActionsRow}>
                          <Pressable
                            onPress={() => setEditingEventId(undefined)}
                            style={styles.linkButton}
                          >
                            <ThemedText themeColor="textSecondary">キャンセル</ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => handleSaveEdit(event.id)}
                            style={styles.linkButton}
                          >
                            <ThemedText themeColor="primary">保存</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <Clock size={IconSize.small} color={theme.textSecondary} />
                            <ThemedText type="footnote" themeColor="textSecondary">
                              勤務時間
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.detailValueBold}>
                            {formatShiftTimeRange(event.startTime, event.endTime, isOvernight)}
                          </ThemedText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <Timer size={IconSize.small} color={theme.textSecondary} />
                            <ThemedText type="footnote" themeColor="textSecondary">
                              実働時間
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.detailValueBold}>
                            {formatHours(breakdown.workedHours)}時間
                          </ThemedText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <Coffee size={IconSize.small} color={theme.textSecondary} />
                            <ThemedText type="footnote" themeColor="textSecondary">
                              休憩時間
                            </ThemedText>
                          </View>
                          <View style={styles.detailValueGroup}>
                            <ThemedText style={styles.detailValueMedium}>
                              {breakdown.breakMinutes}分
                            </ThemedText>
                            {workplaceSettings.breakDeductionEnabled && (
                              <View style={[styles.tagPill, { backgroundColor: theme.border }]}>
                                <ThemedText
                                  style={[styles.tagPillLabel, { color: theme.textSecondary }]}
                                >
                                  自動控除
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelGroup}>
                            <CircleDollarSign size={IconSize.small} color={theme.textSecondary} />
                            <ThemedText type="footnote" themeColor="textSecondary">
                              {workplaceSettings.wageType === 'daily' ? '基本日給' : '基本時給'}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.detailValueMedium}>
                            {formatYen(
                              workplaceSettings.wageType === 'daily'
                                ? workplaceSettings.dailyWage
                                : workplaceSettings.hourlyWage,
                            )}
                          </ThemedText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        <View style={styles.earningsRow}>
                          <View style={styles.detailLabelGroup}>
                            <Wallet size={IconSize.small} color={theme.primary} />
                            <ThemedText style={styles.earningsLabel}>給与見込み</ThemedText>
                          </View>
                          <ThemedText style={[styles.earningsValue, { color: theme.primary }]}>
                            {formatYen(breakdown.earnings)}
                          </ThemedText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        <View style={styles.providerRow}>
                          <View style={styles.detailLabelGroup}>
                            <RefreshCw size={IconSize.small} color={theme.textSecondary} />
                            <ThemedText type="footnote" themeColor="textSecondary">
                              外部連携
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.providerBadge,
                              { backgroundColor: greenBadge.background },
                            ]}
                          >
                            <CheckCircle2 size={IconSize.small} color={theme.success} />
                            <ThemedText
                              style={[styles.providerBadgeLabel, { color: theme.success }]}
                            >
                              {CALENDAR_PROVIDER_LABEL[event.calendarProvider]}連携済み
                            </ThemedText>
                          </View>
                        </View>

                        {isConfirmingDelete ? (
                          <View style={styles.confirmDeleteRow}>
                            <ThemedText type="small" themeColor="danger">
                              本当に削除しますか？
                            </ThemedText>
                            <View style={styles.editActionsRow}>
                              <Pressable
                                onPress={() => setConfirmDeleteId(undefined)}
                                style={styles.linkButton}
                              >
                                <ThemedText themeColor="textSecondary">キャンセル</ThemedText>
                              </Pressable>
                              <Pressable
                                onPress={() => handleConfirmDelete(event.id)}
                                style={styles.linkButton}
                              >
                                <ThemedText themeColor="danger">削除する</ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.actionButtonsRow}>
                            <Pressable onPress={() => startEdit(event)} style={styles.actionButton}>
                              <Pencil size={IconSize.small} color={theme.primary} />
                              <ThemedText
                                style={[styles.actionButtonLabel, { color: theme.primary }]}
                              >
                                編集する
                              </ThemedText>
                            </Pressable>
                            <View
                              style={[styles.actionDivider, { backgroundColor: theme.border }]}
                            />
                            <Pressable
                              onPress={() => setConfirmDeleteId(event.id)}
                              style={styles.actionButton}
                            >
                              <Trash2 size={IconSize.small} color={theme.danger} />
                              <ThemedText
                                style={[styles.actionButtonLabel, { color: theme.danger }]}
                              >
                                シフトを削除
                              </ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </>
                    )}
                  </Card>
                );
              })
            )}

            <Pressable
              onPress={handleCloseDialog}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.text, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ThemedText style={[styles.closeButtonLabel, { color: theme.background }]}>
                閉じる
              </ThemedText>
            </Pressable>
          </ScrollView>
        )}
      </Dialog>

      <Dialog visible={providerChoiceVisible} onClose={() => setProviderChoiceVisible(false)}>
        <ThemedText style={styles.dialogDate}>カレンダーを選択</ThemedText>
        <Pressable
          onPress={() => handleChooseProvider('apple')}
          style={({ pressed }) => [
            styles.providerChoiceRow,
            {
              borderColor: theme.border,
              backgroundColor: pressed ? theme.backgroundElement : 'transparent',
            },
          ]}
        >
          <ThemedText>{CALENDAR_PROVIDER_LABEL.apple}</ThemedText>
          <ChevronRight size={IconSize.small} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => handleChooseProvider('google')}
          style={({ pressed }) => [
            styles.providerChoiceRow,
            {
              borderColor: theme.border,
              backgroundColor: pressed ? theme.backgroundElement : 'transparent',
            },
          ]}
        >
          <ThemedText>{CALENDAR_PROVIDER_LABEL.google}</ThemedText>
          <ChevronRight size={IconSize.small} color={theme.textSecondary} />
        </Pressable>
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statAndToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statPillLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    padding: 2,
  },
  viewToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewToggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset,
  },
  goToCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  goToCalendarLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  ad: {
    marginTop: Spacing.three,
  },
  dialogScroll: {
    maxHeight: 520,
  },
  dialogHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    marginBottom: Spacing.two,
  },
  dialogDate: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  eventCard: {
    gap: 0,
    marginBottom: Spacing.two,
  },
  shiftTypePill: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: Spacing.two,
  },
  shiftTypePillLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  detailValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  detailValueBold: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  detailValueMedium: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  tagPill: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: Spacing.half,
  },
  tagPillLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  earningsLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  earningsValue: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  providerBadgeLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  actionButtonLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionDivider: {
    width: 1,
    height: 14,
  },
  closeButton: {
    height: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  closeButtonLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  linkButton: {
    padding: Spacing.one,
  },
  editForm: {
    gap: Spacing.two,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timeField: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  confirmDeleteRow: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  providerChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
});
