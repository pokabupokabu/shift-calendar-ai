import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TimeFieldButton } from '@/components/calendar/time-field-button';
import { TimePickerPanel } from '@/components/calendar/time-picker-panel';
import { IconBadge } from '@/components/icon-badge';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { resolveShiftTypePreset, SHIFT_TYPE_ICON_PRESETS } from '@/constants/shiftTypeIcons';
import { IconSize, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { isShiftTypeRegistered, type ShiftType } from '@/models';
import { formatShiftTimeRange } from '@/utils/formatShift';

import { DialogBody } from './dialog-body';
import {
  DialogButtonRow,
  DialogTextInput,
  DialogTitle,
  FieldLabel,
  FilledPillButton,
} from './dialog-parts';

/** 指で押しやすい最小の高さ。 */
const MIN_TAP_HEIGHT = 44;
/** 行の先頭・絵の一覧の絵の大きさ。 */
const ROW_ICON_SIZE = 20;
/** 削除の確認のゴミ箱の絵の、丸い淡い地の大きさ（②の削除の確認と同じ）。 */
const DELETE_ICON_BADGE_SIZE = 56;
/** 時刻が空の欄を初めて開いたときに入れる時刻（回す部分が最初に指している時刻をそのまま確定させる）。 */
const DEFAULT_START_TIME = '09:00';
/** 開始時刻があって終了時刻が空のとき、終了時刻の欄を開いたら開始の何時間後を入れるか。 */
const DEFAULT_SHIFT_HOURS = 8;
const DEFAULT_END_TIME = '18:00';
/**
 * 削除の確認の説明文（1行に収める。iPhone SEの小窓の中の幅は約279pt、13ptで全角21文字まで）。
 * 趣旨は「削除すると、シフト表を読み取るときの手がかりからも外れます」（サブグループ④の決定C）。
 */
const DELETE_NOTE = '読み取りの手がかりからも外れます';

type TimeField = 'start' | 'end';

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h + hours) % 24) + 24) % 24;
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 種別の時間帯の表示。時刻が無ければ「未登録」。 */
export function formatShiftTypeTime(shiftType: ShiftType): string | undefined {
  if (!isShiftTypeRegistered(shiftType)) return undefined;
  return formatShiftTimeRange(
    shiftType.startTime,
    shiftType.endTime,
    shiftType.endTime <= shiftType.startTime,
  );
}

export interface ShiftTypeFormProps {
  mode: 'edit' | 'add';
  shiftType: ShiftType;
  /** 種別の並び順（絵が未設定のときの既定の絵を決めるため）。 */
  index: number;
  /** 基本の3つ（早番・遅番・夜勤）。名前と絵は変えられず、「削除」の代わりに「登録しない」。 */
  isBase: boolean;
  onChange: (patch: Partial<ShiftType>) => void;
  onClose: () => void;
  /** 追加の小窓の「追加」。 */
  onConfirmAdd?: () => void;
  /** 追加した種別の「削除する」（確認のあと）。 */
  onDelete?: () => void;
  /** 基本の種別の「登録しない」（時刻を消して未登録に戻す）。 */
  onUnregister?: () => void;
}

/**
 * マイカスタムのシフト種別の編集・追加の小窓の中身（②のカレンダーの小窓と同じ作り）。
 * 時刻は押したときだけ下に回す時刻選択（15分刻み）が開く。追加した種別の削除は、同じ小窓の中で確認を挟む。
 */
export function ShiftTypeForm({
  mode,
  shiftType,
  index,
  isBase,
  onChange,
  onClose,
  onConfirmAdd,
  onDelete,
  onUnregister,
}: ShiftTypeFormProps) {
  const theme = useTheme();
  const [activeTimeField, setActiveTimeField] = useState<TimeField>();
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const preset = resolveShiftTypePreset(shiftType.icon, index);
  const presetColors = useIconBadgeColors(preset.tone);
  const startTime = shiftType.startTime ?? '';
  const endTime = shiftType.endTime ?? '';

  const toggleTimeField = (field: TimeField) => {
    if (activeTimeField === field) {
      setActiveTimeField(undefined);
      return;
    }
    // 空の欄を開いたら、回す部分が最初に指している時刻をそのまま入れる
    // （iPhoneの回す時刻選択は、回さないと値が決まらないため。そのままで良ければ回さずに閉じられる）
    if (field === 'start' && !startTime) onChange({ startTime: DEFAULT_START_TIME });
    if (field === 'end' && !endTime) {
      onChange({
        endTime: startTime ? addHours(startTime, DEFAULT_SHIFT_HOURS) : DEFAULT_END_TIME,
      });
    }
    setActiveTimeField(field);
  };

  if (isConfirmingDelete) {
    const timeLabel = formatShiftTypeTime(shiftType) ?? '未登録';
    return (
      <DialogBody>
        <View style={styles.centered}>
          <IconBadge tone="red" size={DELETE_ICON_BADGE_SIZE}>
            <Trash2 size={IconSize.medium} color={theme.danger} />
          </IconBadge>
        </View>
        <ThemedText type="headline" style={[styles.centeredText, styles.bold]}>
          このシフト種別を削除しますか？
        </ThemedText>
        <View
          style={[
            styles.summaryPill,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={[styles.summaryDot, { backgroundColor: presetColors.icon }]} />
          <ThemedText type="headline" numberOfLines={1} style={styles.shrink}>
            {shiftType.name}
          </ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" numberOfLines={1}>
            {timeLabel}
          </ThemedText>
        </View>
        <ThemedText
          type="footnote"
          themeColor="textSecondary"
          numberOfLines={1}
          style={styles.centeredText}
        >
          {DELETE_NOTE}
        </ThemedText>
        <DialogButtonRow>
          <SecondaryButton
            label="キャンセル"
            onPress={() => setConfirmingDelete(false)}
            style={styles.flexButton}
          />
          <FilledPillButton label="削除する" tone="danger" onPress={() => onDelete?.()} />
        </DialogButtonRow>
      </DialogBody>
    );
  }

  const fieldLabel = activeTimeField === 'end' ? '終了時刻' : '開始時刻';
  const isRegistered = isShiftTypeRegistered(shiftType);
  const hasAnyTime = Boolean(startTime || endTime);

  return (
    <DialogBody>
      <DialogTitle>{mode === 'add' ? 'シフト種別を追加' : 'シフト種別を編集'}</DialogTitle>

      <View style={styles.field}>
        <FieldLabel>シフト名</FieldLabel>
        {isBase ? (
          <View
            style={[
              styles.fixedName,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          >
            <IconBadge tone={preset.tone} size={28}>
              <preset.Icon size={IconSize.small} color={presetColors.icon} />
            </IconBadge>
            <ThemedText type="headline" numberOfLines={1} style={styles.shrink}>
              {shiftType.name}
            </ThemedText>
            <View style={[styles.fixedTag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="caption2" themeColor="textSecondary">
                固定
              </ThemedText>
            </View>
          </View>
        ) : (
          <DialogTextInput
            value={shiftType.name}
            onChangeText={(name) => onChange({ name })}
            accessibilityLabel="シフト名"
          />
        )}
        {isBase && (
          <ThemedText type="footnote" themeColor="textSecondary">
            基本の種別は名前とアイコンを変えられません
          </ThemedText>
        )}
      </View>

      {!isBase && (
        <View style={styles.field}>
          <FieldLabel>アイコン</FieldLabel>
          <View style={styles.iconGrid}>
            {SHIFT_TYPE_ICON_PRESETS.map(({ key, Icon, tone }) => (
              <IconOption
                key={key}
                Icon={Icon}
                tone={tone}
                selected={preset.key === key}
                onPress={() => onChange({ icon: key })}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <View style={styles.timeRow}>
          <TimeFieldButton
            label="開始時刻"
            value={startTime}
            active={activeTimeField === 'start'}
            onPress={() => toggleTimeField('start')}
            placeholder="未登録"
            surface="backgroundElement"
          />
          <TimeFieldButton
            label="終了時刻"
            value={endTime}
            active={activeTimeField === 'end'}
            onPress={() => toggleTimeField('end')}
            placeholder="未登録"
            surface="backgroundElement"
          />
        </View>
        {isBase && hasAnyTime && !isRegistered && (
          <ThemedText type="footnote" themeColor="textSecondary">
            開始と終了の両方を入れると登録されます
          </ThemedText>
        )}
      </View>
      {activeTimeField && (
        <TimePickerPanel
          key={activeTimeField}
          caption={`${fieldLabel}を選択（15分刻み）`}
          value={activeTimeField === 'start' ? startTime : endTime}
          onChange={(value) =>
            onChange(activeTimeField === 'start' ? { startTime: value } : { endTime: value })
          }
        />
      )}

      {mode === 'add' ? (
        <DialogButtonRow>
          <SecondaryButton label="キャンセル" onPress={onClose} style={styles.flexButton} />
          <FilledPillButton
            label="追加"
            tone="primary"
            disabled={!shiftType.name.trim() || !isRegistered}
            onPress={() => onConfirmAdd?.()}
          />
        </DialogButtonRow>
      ) : (
        <DialogButtonRow>
          {isBase ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasAnyTime }}
              disabled={!hasAnyTime}
              onPress={() => {
                setActiveTimeField(undefined);
                onUnregister?.();
              }}
              style={styles.textButton}
            >
              <ThemedText
                type="headline"
                style={{ color: hasAnyTime ? theme.primary : theme.disabled }}
              >
                登録しない
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActiveTimeField(undefined);
                setConfirmingDelete(true);
              }}
              style={styles.textButton}
            >
              <ThemedText type="headline" themeColor="danger">
                削除
              </ThemedText>
            </Pressable>
          )}
          <SecondaryButton label="閉じる" onPress={onClose} style={styles.flexButton} />
        </DialogButtonRow>
      )}
    </DialogBody>
  );
}

function IconOption({
  Icon,
  tone,
  selected,
  onPress,
}: {
  Icon: (typeof SHIFT_TYPE_ICON_PRESETS)[number]['Icon'];
  tone: IconBadgeTone;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const colors = useIconBadgeColors(tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.iconOption, { borderColor: selected ? theme.primary : 'transparent' }]}
    >
      <IconBadge tone={tone}>
        <Icon size={ROW_ICON_SIZE} color={colors.icon} />
      </IconBadge>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  fixedName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MIN_TAP_HEIGHT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
  },
  fixedTag: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
  shrink: {
    flexShrink: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  iconOption: {
    borderRadius: Radius.pill,
    borderWidth: 2,
    padding: Spacing.half,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  textButton: {
    minHeight: MIN_TAP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  flexButton: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
  },
  summaryPill: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.smallLarge,
    borderWidth: 1,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
