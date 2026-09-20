import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

/** 要確認・編集画面: 日付・時刻・シフト種別を編集できる (requirements section 10). */
export default function ShiftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shift = useShiftSessionStore((state) => state.shifts.find((item) => item.id === id));
  const updateShift = useShiftSessionStore((state) => state.updateShift);
  const theme = useTheme();

  const [date, setDate] = useState(shift?.date ?? '');
  const [startTime, setStartTime] = useState(shift?.startTime ?? '');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '');
  const [shiftType, setShiftType] = useState(shift?.shiftType ?? '');
  const [isOvernight, setIsOvernight] = useState(shift?.isOvernight ?? false);

  if (!shift) {
    return (
      <Screen>
        <ThemedText>このシフトは見つかりませんでした。</ThemedText>
      </Screen>
    );
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const handleSave = () => {
    updateShift(shift.id, { date, startTime, endTime, shiftType, isOvernight });
    router.back();
  };

  return (
    <Screen>
      <ThemedText type="small">日付（YYYY-MM-DD）</ThemedText>
      <TextInput value={date} onChangeText={setDate} style={inputStyle} />

      <ThemedText type="small">開始時刻（HH:mm）</ThemedText>
      <TextInput value={startTime} onChangeText={setStartTime} style={inputStyle} />

      <ThemedText type="small">終了時刻（HH:mm）</ThemedText>
      <TextInput value={endTime} onChangeText={setEndTime} style={inputStyle} />

      <ThemedText type="small">シフト種別</ThemedText>
      <TextInput value={shiftType} onChangeText={setShiftType} style={inputStyle} />

      <View style={styles.switchRow}>
        <ThemedText>日をまたぐ（夜勤など）</ThemedText>
        <Switch value={isOvernight} onValueChange={setIsOvernight} />
      </View>

      <PrimaryButton label="保存" onPress={handleSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
