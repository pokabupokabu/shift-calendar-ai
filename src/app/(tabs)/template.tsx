import { Check, ChevronRight, Pencil } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_USER_SETTINGS } from '@/models';
import { useAppStore } from '@/store/useAppStore';
import { buildEventTitle } from '@/utils/eventTitle';
import { formatShiftTimeRange } from '@/utils/formatShift';

const CALENDAR_PROVIDER_LABEL = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
} as const;

const WAGE_TYPE_LABEL = {
  hourly: '時給',
  daily: '日給',
} as const;

interface ShiftTypeFields {
  name: string;
  startTime: string;
  endTime: string;
}

/** テンプレタブ: シフト登録の挙動そのものを決める設定 (requirements section 4, 13). */
export default function TemplateTab() {
  const theme = useTheme();
  const user = useAppStore((state) => state.user);
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const upsertShiftType = useAppStore((state) => state.upsertShiftType);
  const removeShiftType = useAppStore((state) => state.removeShiftType);
  const settings = user?.settings ?? DEFAULT_USER_SETTINGS;

  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const [editingShiftTypeId, setEditingShiftTypeId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<(ShiftTypeFields & { id: string }) | null>(null);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const previewShiftType = shiftTypes[0];
  const previewTitle = previewShiftType
    ? buildEventTitle(settings.eventTitleTemplate, previewShiftType.name)
    : null;

  const editingShiftType = shiftTypes.find((item) => item.id === editingShiftTypeId);

  const handleStartAdd = () => {
    setAddDraft({
      id: `custom-${Date.now()}`,
      name: '新しい種別',
      startTime: '09:00',
      endTime: '18:00',
    });
  };

  const handleConfirmAdd = () => {
    if (addDraft) upsertShiftType(addDraft);
    setAddDraft(null);
  };

  const renderShiftTypeFields = (
    values: ShiftTypeFields,
    onChange: (patch: Partial<ShiftTypeFields>) => void,
  ) => (
    <>
      <TextInput
        value={values.name}
        onChangeText={(name) => onChange({ name })}
        style={inputStyle}
      />
      <View style={styles.timeRow}>
        <TextInput
          value={values.startTime}
          onChangeText={(startTime) => onChange({ startTime })}
          style={[inputStyle, styles.timeInput]}
        />
        <ThemedText>〜</ThemedText>
        <TextInput
          value={values.endTime}
          onChangeText={(endTime) => onChange({ endTime })}
          style={[inputStyle, styles.timeInput]}
        />
      </View>
    </>
  );

  return (
    <Screen>
      <ThemedText type="subtitle">テンプレ</ThemedText>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {previewShiftType && previewTitle && (
          <View style={styles.previewBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              カレンダーにはこう登録される
            </ThemedText>
            <Card style={[styles.previewCard, { backgroundColor: theme.text }]}>
              <ThemedText type="small" style={{ color: theme.background, opacity: 0.7 }}>
                {formatShiftTimeRange(previewShiftType.startTime, previewShiftType.endTime, false)}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {previewTitle}
              </ThemedText>
            </Card>
          </View>
        )}

        <View style={styles.block}>
          <ThemedText type="small" themeColor="textSecondary">
            登録者キーワード
          </ThemedText>
          <Card style={styles.group}>
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>{user?.shiftName || '未設定'}</ThemedText>
              <Pressable
                onPress={() => setNameDialogOpen(true)}
                style={styles.editAffordance}
                hitSlop={Spacing.two}
              >
                <Pencil size={IconSize.small} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  編集
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        </View>

        <View style={styles.block}>
          <ThemedText type="small" themeColor="textSecondary">
            連携済みカレンダー
          </ThemedText>
          <Card style={styles.group}>
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>
                {CALENDAR_PROVIDER_LABEL[settings.defaultCalendarProvider]}
              </ThemedText>
              <View style={styles.connectedTag}>
                <Check size={IconSize.small} color={theme.success} />
                <ThemedText type="small" themeColor="success">
                  連携済み
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/settings/calendar-providers')}
              style={[styles.row, styles.blockBorder, { borderTopColor: theme.border }]}
            >
              <ThemedText style={styles.rowLabel}>その他</ThemedText>
              <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
            </Pressable>
          </Card>
        </View>

        <View style={styles.block}>
          <ThemedText type="small" themeColor="textSecondary">
            給与形態
          </ThemedText>
          <Card style={styles.group}>
            <View style={styles.row}>
              <View style={styles.wageTypeToggle}>
                {(['hourly', 'daily'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => updateSettings({ wageType: option })}
                    style={[
                      styles.wageTypeChoice,
                      {
                        backgroundColor:
                          settings.wageType === option
                            ? theme.backgroundSelected
                            : theme.background,
                      },
                    ]}
                  >
                    <ThemedText type="small">{WAGE_TYPE_LABEL[option]}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.row, styles.blockBorder, { borderTopColor: theme.border }]}>
              <ThemedText style={styles.rowLabel}>時給</ThemedText>
              <TextInput
                value={String(settings.hourlyWage)}
                onChangeText={(value) => updateSettings({ hourlyWage: Number(value) || 0 })}
                keyboardType="number-pad"
                style={[inputStyle, styles.wageAmountInput]}
              />
              <ThemedText themeColor="textSecondary">円</ThemedText>
            </View>
            <View style={[styles.row, styles.blockBorder, { borderTopColor: theme.border }]}>
              <ThemedText style={styles.rowLabel}>日給</ThemedText>
              <TextInput
                value={String(settings.dailyWage)}
                onChangeText={(value) => updateSettings({ dailyWage: Number(value) || 0 })}
                keyboardType="number-pad"
                style={[inputStyle, styles.wageAmountInput]}
              />
              <ThemedText themeColor="textSecondary">円</ThemedText>
            </View>
          </Card>
        </View>

        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              シフト種別
            </ThemedText>
            <Pressable onPress={handleStartAdd} hitSlop={Spacing.two}>
              <ThemedText type="link">＋ 追加</ThemedText>
            </Pressable>
          </View>
          <Card style={styles.group}>
            {shiftTypes.length === 0 ? (
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  まだシフト種別がありません
                </ThemedText>
              </View>
            ) : (
              shiftTypes.map((shiftType, index) => (
                <View
                  key={shiftType.id}
                  style={[
                    styles.row,
                    index > 0 && styles.blockBorder,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <View style={styles.rowLabel}>
                    <ThemedText type="smallBold">{shiftType.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatShiftTimeRange(
                        shiftType.startTime,
                        shiftType.endTime,
                        shiftType.endTime <= shiftType.startTime,
                      )}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => setEditingShiftTypeId(shiftType.id)}
                    style={styles.editAffordance}
                    hitSlop={Spacing.two}
                  >
                    <Pencil size={IconSize.small} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      編集
                    </ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      <Dialog visible={isNameDialogOpen} onClose={() => setNameDialogOpen(false)}>
        <ThemedText type="smallBold">登録者キーワードを編集</ThemedText>
        <TextInput
          value={user?.shiftName ?? ''}
          onChangeText={setShiftName}
          placeholder="シフト表に書かれている自分の名前"
          style={inputStyle}
          autoFocus
        />
        <PrimaryButton label="閉じる" onPress={() => setNameDialogOpen(false)} />
      </Dialog>

      <Dialog visible={!!editingShiftType} onClose={() => setEditingShiftTypeId(null)}>
        {editingShiftType && (
          <>
            <ThemedText type="smallBold">シフト種別を編集</ThemedText>
            {renderShiftTypeFields(editingShiftType, (patch) =>
              upsertShiftType({ ...editingShiftType, ...patch }),
            )}
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => {
                  removeShiftType(editingShiftType.id);
                  setEditingShiftTypeId(null);
                }}
                style={styles.editAffordance}
                hitSlop={Spacing.two}
              >
                <ThemedText themeColor="danger">削除</ThemedText>
              </Pressable>
              <PrimaryButton label="閉じる" onPress={() => setEditingShiftTypeId(null)} />
            </View>
          </>
        )}
      </Dialog>

      <Dialog visible={!!addDraft} onClose={() => setAddDraft(null)}>
        {addDraft && (
          <>
            <ThemedText type="smallBold">シフト種別を追加</ThemedText>
            {renderShiftTypeFields(addDraft, (patch) =>
              setAddDraft((current) => (current ? { ...current, ...patch } : current)),
            )}
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setAddDraft(null)}
                style={styles.editAffordance}
                hitSlop={Spacing.two}
              >
                <ThemedText themeColor="textSecondary">戻る</ThemedText>
              </Pressable>
              <PrimaryButton label="追加" onPress={handleConfirmAdd} />
            </View>
          </>
        )}
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset,
  },
  previewBlock: {
    gap: Spacing.one,
  },
  previewCard: {
    gap: Spacing.half,
  },
  group: {
    padding: 0,
  },
  block: {
    gap: Spacing.two,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockBorder: {
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  rowLabel: {
    flex: 1,
    gap: Spacing.half,
  },
  editAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.one,
  },
  connectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeInput: {
    flex: 1,
    minWidth: 0,
  },
  wageTypeToggle: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  wageTypeChoice: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  wageAmountInput: {
    width: 96,
    textAlign: 'right',
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
