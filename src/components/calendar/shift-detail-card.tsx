import {
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coffee,
  Pencil,
  RefreshCw,
  Timer,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { TimeFieldButton } from '@/components/calendar/time-field-button';
import { TimePickerPanel } from '@/components/calendar/time-picker-panel';
import { IconBadge } from '@/components/icon-badge';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { IconBadgeTones, IconSize, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_WORKPLACE_SETTINGS,
  type CalendarEventRecord,
  type CalendarProviderId,
  type Workplace,
} from '@/models';
import { computeShiftBreakdown } from '@/utils/computePayroll';
import { formatShiftTimeRange } from '@/utils/formatShift';
import { resolveShiftTypeTone } from '@/utils/resolveShiftTypeTone';

export const CALENDAR_PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
};

/** 編集・削除がアプリ内の記録だけを変え、実カレンダーには反映しないことの注意書き（ユーザー決定の文言）。 */
const APP_ONLY_NOTE = 'アプリ内の記録だけ変わります。カレンダーの予定はそのままです';

/** 詳細の各行の左に置く、丸い淡い地のアイコンの大きさ。給与タブの小窓でも使う。 */
export const ROW_ICON_BADGE_SIZE = 32;
/** 削除の確認のゴミ箱の絵の、丸い淡い地の大きさ。 */
const DELETE_ICON_BADGE_SIZE = 56;
/** 「編集する」「シフトを削除」など、指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;

export type TimeField = 'start' | 'end';

export interface EditDraft {
  startTime: string;
  endTime: string;
}

function formatYen(amount: number): string {
  return `${Math.round(amount).toLocaleString('ja-JP')}円`;
}

function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100}`;
}

export interface ShiftDetailCardProps {
  event: CalendarEventRecord;
  workplaces: Workplace[] | undefined;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  editDraft: EditDraft;
  onChangeDraft: (patch: Partial<EditDraft>) => void;
  /** 編集中に回す時刻選択を開いている欄。閉じているときは undefined。 */
  activeTimeField: TimeField | undefined;
  onToggleTimeField: (field: TimeField) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  /** 編集中の「閉じる」。編集をやめて箱ごと閉じる。 */
  onCloseDialog: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

/** カレンダーで日付を押したときの箱の中の、1件ぶんのシフト（詳細・編集・削除の確認）。 */
export function ShiftDetailCard({
  event,
  workplaces,
  isEditing,
  isConfirmingDelete,
  editDraft,
  onChangeDraft,
  activeTimeField,
  onToggleTimeField,
  onStartEdit,
  onSaveEdit,
  onCloseDialog,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: ShiftDetailCardProps) {
  const theme = useTheme();
  const colorScheme = useResolvedColorScheme();
  const blueBadge = useIconBadgeColors('blue');
  const greenBadge = useIconBadgeColors('green');

  const isOvernight = event.endTime <= event.startTime;
  const workplaceSettings =
    workplaces?.find((w) => w.id === event.workplaceId)?.settings ?? DEFAULT_WORKPLACE_SETTINGS;
  // 終日シフトは時刻を持たないため、実働時間・給与は計算できない（計算すると NaN になる）。
  const isAllDay = !!event.isAllDay;
  const breakdown = isAllDay
    ? null
    : computeShiftBreakdown(
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
  const timeRangeLabel = formatShiftTimeRange(
    event.startTime,
    event.endTime,
    isOvernight,
    isAllDay,
  );
  // 種別バッジは日付マスと同じシフト種別の色（マイカスタムの規則）にする。
  const shiftTone: IconBadgeTone = workplaces
    ? resolveShiftTypeTone(workplaces, event.workplaceId, event.shiftType)
    : 'blue';
  const shiftColors = IconBadgeTones[colorScheme][shiftTone];

  const shiftTypeBadge = event.shiftType ? (
    <View style={[styles.shiftTypePill, { backgroundColor: shiftColors.background }]}>
      <ThemedText type="footnote" style={[styles.boldLabel, { color: shiftColors.icon }]}>
        {event.shiftType}
      </ThemedText>
    </View>
  ) : null;

  if (isEditing) {
    const fieldLabel = activeTimeField === 'end' ? '終了時刻' : '開始時刻';
    return (
      <Card style={styles.card}>
        {shiftTypeBadge}
        <View style={styles.timeRow}>
          <TimeFieldButton
            label="開始時刻"
            value={editDraft.startTime}
            active={activeTimeField === 'start'}
            onPress={() => onToggleTimeField('start')}
          />
          <TimeFieldButton
            label="終了時刻"
            value={editDraft.endTime}
            active={activeTimeField === 'end'}
            onPress={() => onToggleTimeField('end')}
          />
        </View>
        {activeTimeField && (
          <TimePickerPanel
            key={activeTimeField}
            caption={`${fieldLabel}を選択（15分刻み）`}
            value={activeTimeField === 'start' ? editDraft.startTime : editDraft.endTime}
            onChange={(value) =>
              onChangeDraft(activeTimeField === 'start' ? { startTime: value } : { endTime: value })
            }
          />
        )}
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.centeredText}>
          {APP_ONLY_NOTE}
        </ThemedText>
        <View style={styles.buttonRow}>
          <SecondaryButton label="閉じる" onPress={onCloseDialog} style={styles.narrowButton} />
          <Pressable
            accessibilityRole="button"
            onPress={onSaveEdit}
            style={({ pressed }) => [
              styles.filledButton,
              styles.wideButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="title3" style={{ color: theme.onPrimary }}>
              保存
            </ThemedText>
          </Pressable>
        </View>
      </Card>
    );
  }

  if (isConfirmingDelete) {
    return (
      <Card style={styles.card}>
        {shiftTypeBadge}
        {/* 何を消すのかが分かるよう、勤務時間と給与見込みを1行で添える */}
        <View style={[styles.summaryRow, { backgroundColor: theme.fill }]}>
          <View style={styles.summaryLabel}>
            <Clock size={IconSize.small} color={shiftColors.icon} />
            {/* iPhone SE の幅でも途中で折り返さないよう、実働時間は時刻の下の2行目に分ける */}
            <View style={styles.shrinkText}>
              <ThemedText type="subheadline" numberOfLines={1}>
                {timeRangeLabel}
              </ThemedText>
              {breakdown && (
                <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
                  実働{formatHours(breakdown.workedHours)}時間
                </ThemedText>
              )}
            </View>
          </View>
          {breakdown && (
            <ThemedText
              type="subheadline"
              themeColor="primary"
              numberOfLines={1}
              style={[styles.boldLabel, styles.noShrink]}
            >
              {formatYen(breakdown.earnings)}
            </ThemedText>
          )}
        </View>
        <View style={styles.deleteIcon}>
          <IconBadge tone="red" size={DELETE_ICON_BADGE_SIZE}>
            <Trash2 size={IconSize.medium} color={theme.danger} />
          </IconBadge>
        </View>
        <ThemedText type="headline" style={[styles.centeredText, styles.boldLabel]}>
          このシフトを削除しますか？
        </ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" style={styles.centeredText}>
          {APP_ONLY_NOTE}
        </ThemedText>
        <View style={styles.buttonRow}>
          <SecondaryButton label="キャンセル" onPress={onCancelDelete} style={styles.evenButton} />
          <Pressable
            accessibilityRole="button"
            onPress={onConfirmDelete}
            style={({ pressed }) => [
              styles.filledButton,
              styles.evenButton,
              { backgroundColor: theme.danger, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="headline" style={{ color: theme.onPrimary }}>
              削除する
            </ThemedText>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      {shiftTypeBadge}
      <View>
        <DetailRow Icon={Clock} label="勤務時間">
          <ThemedText type="headline">{timeRangeLabel}</ThemedText>
        </DetailRow>
        {isAllDay && (
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.allDayNote}>
            時刻が読み取れなかったシフトです。実働時間と給与見込みは計算できないため、月間・年間の集計にも含めていません。
          </ThemedText>
        )}
        {!isAllDay && breakdown && (
          <>
            <DetailRow Icon={Timer} label="実働時間">
              <ThemedText type="headline">{formatHours(breakdown.workedHours)}時間</ThemedText>
            </DetailRow>
            <DetailRow Icon={Coffee} label="休憩時間">
              <ThemedText type="headline">{breakdown.breakMinutes}分</ThemedText>
            </DetailRow>
            <DetailRow
              Icon={CircleDollarSign}
              label={workplaceSettings.wageType === 'daily' ? '基本日給' : '基本時給'}
            >
              <ThemedText type="headline">
                {formatYen(
                  workplaceSettings.wageType === 'daily'
                    ? workplaceSettings.dailyWage
                    : workplaceSettings.hourlyWage,
                )}
              </ThemedText>
            </DetailRow>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.detailRow}>
              <View style={styles.detailLabelGroup}>
                <IconBadge tone="blue" size={ROW_ICON_BADGE_SIZE}>
                  <Wallet size={IconSize.small} color={blueBadge.icon} />
                </IconBadge>
                <ThemedText type="headline" themeColor="primary">
                  給与見込み
                </ThemedText>
              </View>
              <ThemedText type="title2" themeColor="primary">
                {formatYen(breakdown.earnings)}
              </ThemedText>
            </View>
          </>
        )}
        <View style={styles.detailRow}>
          <View style={styles.detailLabelGroup}>
            <IconBadge tone="neutral" size={ROW_ICON_BADGE_SIZE}>
              <RefreshCw size={IconSize.small} color={theme.textSecondary} />
            </IconBadge>
            <ThemedText type="subheadline" themeColor="textSecondary">
              外部連携
            </ThemedText>
          </View>
          <View style={[styles.providerBadge, { backgroundColor: greenBadge.background }]}>
            <CheckCircle2 size={IconSize.small} color={theme.success} />
            <ThemedText type="caption2" style={[styles.shrinkText, { color: theme.success }]}>
              {CALENDAR_PROVIDER_LABEL[event.calendarProvider]}連携済み
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.actionButtonsRow}>
        <Pressable accessibilityRole="button" onPress={onStartEdit} style={styles.actionButton}>
          <Pencil size={IconSize.small} color={theme.primary} />
          <ThemedText style={[styles.actionButtonLabel, { color: theme.primary }]}>
            編集する
          </ThemedText>
        </Pressable>
        <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
        <Pressable accessibilityRole="button" onPress={onRequestDelete} style={styles.actionButton}>
          <Trash2 size={IconSize.small} color={theme.danger} />
          <ThemedText style={[styles.actionButtonLabel, { color: theme.danger }]}>
            シフトを削除
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

/** 小窓の詳細の1行（左に丸い淡い青の地のアイコン＋灰色のラベル、右に値）。給与タブの小窓でも使う。 */
export function DetailRow({
  Icon,
  label,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  const blueBadge = useIconBadgeColors('blue');
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelGroup}>
        <IconBadge tone="blue" size={ROW_ICON_BADGE_SIZE}>
          <Icon size={IconSize.small} color={blueBadge.icon} />
        </IconBadge>
        <ThemedText type="subheadline" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  shiftTypePill: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
  },
  boldLabel: {
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  allDayNote: {
    paddingVertical: Spacing.one,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: MIN_TAP_HEIGHT,
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
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  narrowButton: {
    flex: 1,
  },
  wideButton: {
    flex: 2,
  },
  evenButton: {
    flex: 1,
  },
  filledButton: {
    minHeight: MIN_TAP_HEIGHT,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.smallLarge,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  shrinkText: {
    flexShrink: 1,
  },
  noShrink: {
    flexShrink: 0,
  },
  deleteIcon: {
    alignItems: 'center',
  },
});
