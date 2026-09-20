import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Shift } from '@/models';
import { needsReview } from '@/models';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { formatShiftDate, formatShiftTimeRange } from '@/utils/formatShift';

function ShiftRow({ shift }: { shift: Shift }) {
  const theme = useTheme();
  const flagged = needsReview(shift);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/shift-review', params: { id: shift.id } })}
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}
    >
      <View style={styles.rowText}>
        <ThemedText type="smallBold">
          {formatShiftDate(shift.date)} {shift.shiftType}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {formatShiftTimeRange(shift.startTime, shift.endTime, shift.isOvernight)}
        </ThemedText>
      </View>
      {flagged && <ThemedText type="smallBold">要確認</ThemedText>}
    </Pressable>
  );
}

/** シフト結果一覧 (requirements section 9). */
export default function ShiftResultsScreen() {
  const shifts = useShiftSessionStore((state) => state.shifts);
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Screen>
      <ThemedText type="subtitle">あなたのシフトはこちらです</ThemedText>
      <FlatList
        data={sorted}
        keyExtractor={(shift) => shift.id}
        renderItem={({ item }) => <ShiftRow shift={item} />}
        contentContainerStyle={styles.list}
      />
      <PrimaryButton
        label="カレンダー登録へ進む"
        onPress={() => router.push('/calendar-confirm')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: {
    gap: Spacing.half,
  },
});
