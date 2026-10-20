import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { isShiftTypeRegistered } from '@/models';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { hasUsableTimeRange } from '@/utils/shiftTime';

/**
 * シフトの編集画面: 時刻は自由入力（"HH:mm"）、日をまたぐかどうかは
 * 開始・終了時刻の大小関係から自動判定する (requirements section 10)。
 * 日付は読み取り専用、シフト種別は登録済みテンプレートからの選択のみに対応する。
 *
 * 時刻が読み取れなかったシフト（終日）もこの画面で扱う。両方の時刻を入れて保存すると
 * 通常のシフトに変わり、給与計算の対象になる。逆に時刻を消せば終日に戻る。
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

  return (
    <Screen>
      <View style={styles.header}>
        <IconBadge tone="blue" size={44}>
          <Calendar size={IconSize.medium} color={badgeColors.icon} />
        </IconBadge>
        <View style={styles.headerText}>
          <ThemedText type="headline" style={styles.headerTitle}>
            シフトの編集
          </ThemedText>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.sectionLabel}>
          日付
        </ThemedText>
        <ThemedText type="body">{shift.date}</ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.sectionLabel}>
          シフト種別
        </ThemedText>
        <Pressable onPress={() => setPickerOpen(true)} style={styles.shiftTypeRow}>
          {matchedShiftType ? (
            <View style={[styles.shiftTypeBadge, { backgroundColor: badgeColors.background }]}>
              <ThemedText type="subheadline" themeColor="primary" style={styles.shiftTypeBadgeText}>
                {matchedShiftType.name}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.shiftTypeBadge, { backgroundColor: neutralColors.background }]}>
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
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.timeSectionRow}>
          <View style={styles.timeSectionLabel}>
            <Clock size={IconSize.small} color={theme.textSecondary} />
            <ThemedText type="subheadline" style={styles.timeSectionLabelText}>
              勤務時間
            </ThemedText>
          </View>
          <View style={styles.timeBoxRow}>
            <View
              style={[
                styles.timeBox,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:mm"
                style={[styles.timeBoxInput, { color: theme.text }]}
              />
            </View>
            <ThemedText themeColor="textSecondary">〜</ThemedText>
            <View
              style={[
                styles.timeBox,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:mm"
                style={[styles.timeBoxInput, { color: theme.text }]}
              />
            </View>
          </View>
        </View>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  section: {
    borderRadius: Radius.smallLarge,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionLabel: {
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
  },
  timeSectionLabelText: {
    fontWeight: '600',
  },
  timeBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeBox: {
    borderRadius: Radius.small,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  timeBoxInput: {
    width: 56,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    padding: 0,
  },
  shiftTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftTypeBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  shiftTypeBadgeText: {
    fontWeight: '600',
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
