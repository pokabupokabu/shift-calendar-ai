import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { format, parse, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

const TIME_FORMAT = 'HH:mm';
const DATE_FORMAT = 'yyyy-MM-dd';

/** "HH:mm" has no date component, so anchor it to an arbitrary reference date for the picker. */
function parseShiftTime(time: string): Date {
  return parse(time, TIME_FORMAT, new Date());
}

/**
 * 要確認・編集画面: 日付・時刻をネイティブピッカーで、シフト種別・日跨ぎはこれまで通り編集できる
 * (requirements section 10、README「8. 不明点・リスク」5でPhase 3対応が指示されていた項目)。
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
      <ThemedText type="small">日付</ThemedText>
      <DateTimePicker
        value={parseISO(date)}
        mode="date"
        display="compact"
        onValueChange={(_event, value) => setDate(format(value, DATE_FORMAT))}
      />

      <ThemedText type="small">開始時刻</ThemedText>
      <DateTimePicker
        value={parseShiftTime(startTime)}
        mode="time"
        display="compact"
        onValueChange={(_event, value) => setStartTime(format(value, TIME_FORMAT))}
      />

      <ThemedText type="small">終了時刻</ThemedText>
      <DateTimePicker
        value={parseShiftTime(endTime)}
        mode="time"
        display="compact"
        onValueChange={(_event, value) => setEndTime(format(value, TIME_FORMAT))}
      />

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
