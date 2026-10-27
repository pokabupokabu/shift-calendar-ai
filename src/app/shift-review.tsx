import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Clock, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatLongDate } from '@/components/calendar/date-picker-panel';
import { PickerChip } from '@/components/calendar/picker-chip';
import { TimePickerPanel } from '@/components/calendar/time-picker-panel';
import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { isShiftTypeRegistered, needsReview } from '@/models';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { hasUsableTimeRange } from '@/utils/shiftTime';

/**
 * シフトの編集画面: 時刻は札を押して回して選ぶ（15分刻み・24時間。グループB2の決定12）。
 * 日をまたぐかどうかは開始・終了時刻の大小関係から自動判定する (requirements section 10)。
 * 日付は読み取り専用、シフト種別は登録済みテンプレートからの選択のみに対応する。
 *
 * 時刻が読み取れなかったシフト（終日）もこの画面で扱う。両方の時刻を入れて保存すると
 * 通常のシフトに変わり、給与計算の対象になる。逆に「時刻なし（終日）にする」を押して
 * 時刻を空にしてから保存すれば終日に戻る。
 */
export default function ShiftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shift = useShiftSessionStore((state) => state.shifts.find((item) => item.id === id));
  const updateShift = useShiftSessionStore((state) => state.updateShift);
  const removeShift = useShiftSessionStore((state) => state.removeShift);
  const user = useAppStore((state) => state.user);
  // 確認画面と同じ勤務先のシフト種別を出す（photo-select で選んだ勤務先）。
  const scanWorkplaceId = useShiftSessionStore((state) => state.scanWorkplaceId);
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === scanWorkplaceId) ??
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ??
    user?.workplaces[0];
  const shiftTypes = activeWorkplace?.shiftTypes ?? [];
  const theme = useTheme();
  const badgeColors = useIconBadgeColors('blue');
  const neutralColors = useIconBadgeColors('neutral');

  const [startTime, setStartTime] = useState(shift?.startTime ?? '');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '');
  const [shiftType, setShiftType] = useState(shift?.shiftType ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  // 下に回す時刻選択を開いている札。閉じているときは null。
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end' | null>(null);
  const toggleTimeField = (field: 'start' | 'end') =>
    setActiveTimeField((current) => (current === field ? null : field));

  if (!shift) {
    return (
      <Screen>
        <ThemedText>このシフトは見つかりませんでした。</ThemedText>
      </Screen>
    );
  }

  const matchedShiftType = shiftTypes.find((template) => template.name === shiftType);

  // 片方しか入っていない・時刻として読めない場合は時刻を確定できないため終日のままにする。
  const willBeAllDay = !hasUsableTimeRange(startTime, endTime);

  const handleSave = () => {
    updateShift(
      shift.id,
      willBeAllDay
        ? {
            date: shift.date,
            startTime: '',
            endTime: '',
            shiftType,
            isOvernight: false,
            isAllDay: true,
          }
        : {
            date: shift.date,
            startTime,
            endTime,
            shiftType,
            isOvernight: endTime <= startTime,
            isAllDay: false,
          },
    );
    router.back();
  };

  const handleDelete = () => {
    removeShift(shift.id);
    router.back();
  };

  // 内容の確認の一覧と同じ条件（classifyShift の needs_review と同じ needsReview）で「要確認」を判定する。
  const isNeedsReview = needsReview(shift);
  const activeTimeLabel = activeTimeField === 'end' ? '終了時刻' : '開始時刻';

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 要確認の日を開いたときだけ出す。数値・割合は出さない（B2の決定11） */}
        {isNeedsReview && (
          <View
            accessibilityRole="alert"
            style={[
              styles.reviewBanner,
              { backgroundColor: theme.dangerSurface, borderColor: theme.dangerSurfaceBorder },
            ]}
          >
            <TriangleAlert size={IconSize.small} color={theme.danger} />
            <ThemedText type="footnote" themeColor="danger" style={styles.reviewBannerText}>
              {/* 「原／本」と言葉の途中で折り返さないよう、文の切れ目で改行する */}
              {'AIの読み取りに自信がない日です。\nシフト表の原本と見比べてください。'}
            </ThemedText>
          </View>
        )}

        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          {/* 日付は今までどおり読み取り専用（表示だけ「10月8日（木）」の形に。B2の決定10） */}
          <View style={styles.dateBlock}>
            <ThemedText type="subheadline" themeColor="textSecondary">
              日付
            </ThemedText>
            <ThemedText type="title3" style={styles.dateValue}>
              {formatLongDate(shift.date)}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={styles.shiftTypeRow}
          >
            <ThemedText type="subheadline" themeColor="textSecondary">
              シフト種別
            </ThemedText>
            <View style={styles.shiftTypeValue}>
              {matchedShiftType ? (
                <View style={[styles.shiftTypeBadge, { backgroundColor: badgeColors.background }]}>
                  <ThemedText
                    type="subheadline"
                    themeColor="primary"
                    style={styles.shiftTypeBadgeText}
                  >
                    {matchedShiftType.name}
                  </ThemedText>
                </View>
              ) : (
                <View
                  style={[styles.shiftTypeBadge, { backgroundColor: neutralColors.background }]}
                >
                  <ThemedText
                    type="subheadline"
                    themeColor="textSecondary"
                    style={styles.shiftTypeBadgeText}
                  >
                    シフト種別未登録
                  </ThemedText>
                </View>
              )}
              <ChevronRight size={IconSize.small} color={theme.textSecondary} />
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* 時刻は文字入力をやめ、札を押して回して選ぶ（B2の決定12。グループA②と同じ部品） */}
          <View style={styles.timeSectionRow}>
            <View style={styles.timeSectionLabel}>
              <Clock size={IconSize.small} color={theme.textSecondary} />
              <ThemedText type="body" style={styles.timeSectionLabelText}>
                勤務時間
              </ThemedText>
            </View>
            <View style={styles.chipRow}>
              <PickerChip
                accessibilityName="開始時刻"
                value={startTime}
                active={activeTimeField === 'start'}
                onPress={() => toggleTimeField('start')}
              />
              <ThemedText type="subheadline" themeColor="textSecondary">
                〜
              </ThemedText>
              <PickerChip
                accessibilityName="終了時刻"
                value={endTime}
                active={activeTimeField === 'end'}
                onPress={() => toggleTimeField('end')}
              />
            </View>
          </View>
          {activeTimeField && (
            <TimePickerPanel
              key={activeTimeField}
              caption={`${activeTimeLabel}を選択（15分刻み）`}
              value={activeTimeField === 'start' ? startTime : endTime}
              onChange={activeTimeField === 'start' ? setStartTime : setEndTime}
            />
          )}
          {/* 時刻を空にして終日に戻す（文字入力をやめたので、消す手段をここに置く）。もう空なら出さない */}
          {(startTime !== '' || endTime !== '') && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStartTime('');
                setEndTime('');
                setActiveTimeField(null);
              }}
              style={styles.clearTimeButton}
            >
              <ThemedText type="subheadline" themeColor="primary">
                時刻なし（終日）にする
              </ThemedText>
            </Pressable>
          )}
          {willBeAllDay && (
            <ThemedText type="footnote" themeColor="textSecondary">
              時間が入っていないため「終日」で登録されます。給与の見込み額には含まれません。両方の時間を入れると通常のシフトとして計算に入ります。
            </ThemedText>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="保存する" onPress={handleSave} />
          <Pressable onPress={handleDelete} style={styles.deleteLink} hitSlop={Spacing.two}>
            <ThemedText type="subheadline" themeColor="danger" style={styles.deleteLinkText}>
              このシフトを削除
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Dialog visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <ThemedText type="headline" style={styles.dialogTitle}>
          シフト種別を選択
        </ThemedText>
        {shiftTypes.length === 0 ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.dialogEmptyText}>
            登録済みのシフト種別がありません。
          </ThemedText>
        ) : (
          <View>
            {shiftTypes.map((template, index) => (
              <Pressable
                key={template.id}
                onPress={() => {
                  setShiftType(template.name);
                  // 時刻が未登録の種別は名前だけ変え、今入っている時刻はそのまま残す
                  if (isShiftTypeRegistered(template)) {
                    setStartTime(template.startTime);
                    setEndTime(template.endTime);
                  }
                  setPickerOpen(false);
                }}
                style={[
                  styles.pickerRow,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border,
                  },
                ]}
              >
                <ThemedText type="body">{template.name}</ThemedText>
                <ThemedText type="caption1" themeColor="textSecondary">
                  {isShiftTypeRegistered(template)
                    ? `${template.startTime}〜${template.endTime}`
                    : '時刻は未登録'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={() => setPickerOpen(false)} style={styles.dialogCancel}>
          <ThemedText type="body" themeColor="textSecondary" style={styles.dialogCancelText}>
            キャンセル
          </ThemedText>
        </Pressable>
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
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.smallLarge,
    padding: Spacing.three - Spacing.one,
  },
  reviewBannerText: {
    flex: 1,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three - Spacing.one,
  },
  dateBlock: {
    gap: Spacing.one,
  },
  dateValue: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  shiftTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TAP_HEIGHT,
  },
  shiftTypeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  shiftTypeBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  shiftTypeBadgeText: {
    fontWeight: '600',
  },
  timeSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  timeSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  timeSectionLabelText: {
    fontWeight: '600',
  },
  clearTimeButton: {
    alignSelf: 'flex-start',
    minHeight: MIN_TAP_HEIGHT,
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogEmptyText: {
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  dialogCancel: {
    padding: Spacing.two,
  },
  dialogCancelText: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
  deleteLink: {
    alignSelf: 'center',
    padding: Spacing.two,
  },
  deleteLinkText: {
    textAlign: 'center',
    fontWeight: '500',
  },
});
