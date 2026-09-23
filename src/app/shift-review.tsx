import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

/**
 * 要確認・編集画面: 日付・時刻は自由入力（"YYYY-MM-DD"/"HH:mm"）、日をまたぐかどうかは
 * 開始・終了時刻の大小関係から自動判定する (requirements section 10)。
 */
export default function ShiftReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shift = useShiftSessionStore((state) => state.shifts.find((item) => item.id === id));
  const updateShift = useShiftSessionStore((state) => state.updateShift);
  const theme = useTheme();

  const [date, setDate] = useState(shift?.date ?? '');
  const [startTime, setStartTime] = useState(shift?.startTime ?? '');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '');
  const [shiftType, setShiftType] = useState(shift?.shiftType ?? '');

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
    updateShift(shift.id, {
      date,
      startTime,
      endTime,
      shiftType,
      isOvernight: endTime <= startTime,
    });
    router.back();
  };

  return (
    <Screen>
      <ThemedText type="small">日付</ThemedText>
      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={inputStyle} />

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <ThemedText type="small">開始時刻</ThemedText>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:mm"
            style={inputStyle}
          />
        </View>
        <View style={styles.timeField}>
          <ThemedText type="small">終了時刻</ThemedText>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:mm"
            style={inputStyle}
          />
        </View>
      </View>

      <ThemedText type="small">シフト種別</ThemedText>
      <TextInput value={shiftType} onChangeText={setShiftType} style={inputStyle} />

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
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timeField: {
    flex: 1,
    gap: Spacing.one,
  },
});
