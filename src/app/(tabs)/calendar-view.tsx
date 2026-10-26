import { isSameMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { MonthGrid } from '@/components/calendar/month-grid';
import { MonthList } from '@/components/calendar/month-list';
import {
  CALENDAR_PROVIDER_LABEL,
  ShiftDetailCard,
  type EditDraft,
  type TimeField,
} from '@/components/calendar/shift-detail-card';
import { Dialog } from '@/components/dialog';
import { TabTitleRow } from '@/components/header-status';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useMonthNavigation } from '@/hooks/use-month-navigation';
import { getCalendarProvider } from '@/services/calendar';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';
import { useAppStore } from '@/store/useAppStore';
import { hasUsableTimeRange } from '@/utils/shiftTime';
import { formatShiftDate } from '@/utils/formatShift';
import type { CalendarEventRecord, CalendarProviderId } from '@/models';

type ViewMode = 'month' | 'list';

/**
 * PROの月表示で、いちばん下（「カレンダーを見に行く」の下）に空ける高さ。
 * タブバーの青いスキャンボタンはタブバーの上端から約31pt上にはみ出しているので、
 * ボタンの文字がそこに隠れないだけの高さにする。
 *
 * PROの高さの決め方: ScrollView の中身を flexGrow で「見えている高さ」いっぱいにし、
 * 曜日の見出し・表の枠・ボタン・この余白を除いた残りを、MonthGrid が週の行に均等に配る
 * （レイアウト時に実際の高さで決まるので、機種ごとの固定値は持たない）。
 * iPhone SE（375×667・ステータスバー20・タブバー56）での見積もり:
 *   見えている高さ = 667 − 20 − 56 − 上下の余白48 − 見出し34 − 切り替え32 − 月送り32 − すき間16×3 = 397
 *   6週の月 = 曜日15 ＋ 表の枠6 ＋ 行48×6（＋区切り線）≈290.5 ＋ すき間8 ＋ ボタン44 ＋ 余白32 ≈ 395.5
 * なので、行が最低の高さ（MonthGrid の FILL_WEEK_ROW_MIN_HEIGHT）のままスクロールせずに収まる。
 */
const PRO_MONTH_BOTTOM_CLEARANCE = Spacing.five;

const VIEW_MODE_OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'month', label: '月' },
  { mode: 'list', label: 'リスト' },
];
/** 切り替えの見た目の高さは32pt。上下に6ptずつ広げて、押せる高さを44ptにする。 */
const VIEW_TOGGLE_HIT_SLOP = { top: 6, bottom: 6, left: 0, right: 0 };

export default function CalendarViewTab() {
  const theme = useTheme();
  const blueBadge = useIconBadgeColors('blue');
  const { month, goToPrevMonth, goToNextMonth, label } = useMonthNavigation();
  const calendarEvents = useAppStore((state) => state.calendarEvents);
  const workplaces = useAppStore((state) => state.user?.workplaces);
  const provider = useAppStore(
    (state) => state.user?.workplaces[0]?.settings.defaultCalendarProvider ?? 'apple',
  );
  const updateCalendarEvent = useAppStore((state) => state.updateCalendarEvent);
  const removeCalendarEvent = useAppStore((state) => state.removeCalendarEvent);
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [editingEventId, setEditingEventId] = useState<string | undefined>(undefined);
  const [editDraft, setEditDraft] = useState<EditDraft>({ startTime: '', endTime: '' });
  const [activeTimeField, setActiveTimeField] = useState<TimeField | undefined>(undefined);
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
  // PROは広告が無いぶん、空いた高さまで日付マスを伸ばす（MonthGrid の fillAvailableHeight）。
  const fillMonthGrid = isPro && viewMode === 'month';

  const resetDialogEditState = () => {
    setEditingEventId(undefined);
    setConfirmDeleteId(undefined);
    setActiveTimeField(undefined);
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
    setActiveTimeField(undefined);
    // 日付は変えられない（箱の上に出ている日付のまま）。時刻だけを編集する。
    setEditDraft({ startTime: event.startTime, endTime: event.endTime });
  };

  const handleSaveEdit = (eventId: string) => {
    // 終日シフトにあとから時刻を入れたら通常のシフトに戻す（逆に消せば終日に戻る）。
    const isAllDay = !hasUsableTimeRange(editDraft.startTime, editDraft.endTime);
    updateCalendarEvent(eventId, {
      startTime: isAllDay ? '' : editDraft.startTime,
      endTime: isAllDay ? '' : editDraft.endTime,
      isAllDay,
    });
    setEditingEventId(undefined);
    setActiveTimeField(undefined);
  };

  const handleConfirmDelete = (eventId: string) => {
    removeCalendarEvent(eventId);
    setConfirmDeleteId(undefined);
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.topSection}>
        <TabTitleRow title="カレンダー" />

        <View style={styles.statAndToggleRow}>
          <View style={[styles.statPill, { backgroundColor: blueBadge.background }]}>
            <ThemedText style={[styles.statPillLabel, { color: blueBadge.icon }]}>
              今月: {workedDaysCount}日勤務
            </ThemedText>
          </View>

          <View
            style={[styles.viewToggle, { backgroundColor: theme.fill, borderColor: theme.border }]}
          >
            {VIEW_MODE_OPTIONS.map((option) => {
              const active = viewMode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  onPress={() => setViewMode(option.mode)}
                  hitSlop={VIEW_TOGGLE_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.viewToggleOption,
                    active && [
                      styles.viewToggleOptionActive,
                      { backgroundColor: theme.backgroundElement },
                    ],
                  ]}
                >
                  <ThemedText
                    type="footnote"
                    style={[
                      styles.viewToggleLabel,
                      { color: active ? theme.text : theme.textSecondary },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
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
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, fillMonthGrid && styles.listContentFill]}
      >
        {viewMode === 'month' ? (
          <View style={[styles.monthGridInset, fillMonthGrid && styles.fill]}>
            <MonthGrid
              month={month}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              fillAvailableHeight={fillMonthGrid}
            />
          </View>
        ) : (
          <View style={styles.sideInset}>
            <MonthList
              month={month}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          </View>
        )}

        <Pressable
          onPress={handleOpenCalendar}
          disabled={isOpeningCalendar}
          style={({ pressed }) => [
            styles.goToCalendarButton,
            styles.sideInset,
            {
              backgroundColor: theme.beigeButton,
              opacity: pressed || isOpeningCalendar ? 0.85 : 1,
            },
          ]}
        >
          <ThemedText type="headline" style={{ color: theme.onBeigeButton }}>
            カレンダーを見に行く
          </ThemedText>
          <ChevronRight size={IconSize.small} color={theme.onBeigeButton} />
        </Pressable>
        <View style={styles.sideInset}>
          <AdPlaceholder slot="calendar-view" style={styles.ad} />
        </View>
      </ScrollView>

      <Dialog visible={selectedDate !== undefined} onClose={handleCloseDialog}>
        {selectedDate && (
          <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.dialogBody}>
              <ThemedText type="title2">{formatShiftDate(selectedDate)}</ThemedText>

              {selectedEvents.length === 0 ? (
                <ThemedText type="subheadline" themeColor="textSecondary">
                  この日のシフトは登録されていません
                </ThemedText>
              ) : (
                selectedEvents.map((event) => (
                  <ShiftDetailCard
                    key={event.id}
                    event={event}
                    workplaces={workplaces}
                    isEditing={editingEventId === event.id}
                    isConfirmingDelete={confirmDeleteId === event.id}
                    editDraft={editDraft}
                    onChangeDraft={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
                    activeTimeField={activeTimeField}
                    onToggleTimeField={(field) =>
                      setActiveTimeField((current) => (current === field ? undefined : field))
                    }
                    onStartEdit={() => startEdit(event)}
                    onSaveEdit={() => handleSaveEdit(event.id)}
                    onCloseDialog={handleCloseDialog}
                    onRequestDelete={() => {
                      setEditingEventId(undefined);
                      setActiveTimeField(undefined);
                      setConfirmDeleteId(event.id);
                    }}
                    onCancelDelete={() => setConfirmDeleteId(undefined)}
                    onConfirmDelete={() => handleConfirmDelete(event.id)}
                  />
                ))
              )}

              {/* 編集中・削除の確認中は、その箱の中のボタン（閉じる／キャンセル）だけを出す */}
              {!editingEventId && !confirmDeleteId && (
                <SecondaryButton label="閉じる" onPress={handleCloseDialog} />
              )}
            </View>
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
    borderWidth: 1,
    padding: Spacing.half,
  },
  viewToggleOption: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small - Spacing.half,
  },
  viewToggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  viewToggleLabel: {
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
  // PROの月表示: 中身を ScrollView の見えている高さいっぱいにし、空いたぶんを表（MonthGrid）に渡す。
  listContentFill: {
    flexGrow: 1,
    paddingBottom: PRO_MONTH_BOTTOM_CLEARANCE,
  },
  fill: {
    flexGrow: 1,
  },
  // スクロール領域は画面の幅いっぱいに置き（自分の範囲で中身を切り取るため）、左右の余白は中身の側で付ける。
  // 見出し・ボタン・広告・リストは24pt、月表示の表だけマスの幅を確保するため8pt。
  screen: {
    paddingHorizontal: 0,
  },
  topSection: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  sideInset: {
    marginHorizontal: Spacing.four,
  },
  monthGridInset: {
    marginHorizontal: Spacing.two,
  },
  goToCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
  ad: {
    marginTop: Spacing.three,
  },
  dialogScroll: {
    maxHeight: 520,
  },
  dialogBody: {
    gap: Spacing.three,
  },
  dialogDate: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: Spacing.two,
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
