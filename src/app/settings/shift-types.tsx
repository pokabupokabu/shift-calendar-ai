import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShiftType } from '@/models';
import { useAppStore } from '@/store/useAppStore';

function ShiftTypeRow({ shiftType }: { shiftType: ShiftType }) {
  const theme = useTheme();
  const upsertShiftType = useAppStore((state) => state.upsertShiftType);
  const removeShiftType = useAppStore((state) => state.removeShiftType);

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <TextInput
        value={shiftType.name}
        onChangeText={(name) => upsertShiftType({ ...shiftType, name })}
        style={[inputStyle, styles.nameInput]}
      />
      <TextInput
        value={shiftType.startTime}
        onChangeText={(startTime) => upsertShiftType({ ...shiftType, startTime })}
        style={[inputStyle, styles.timeInput]}
      />
      <ThemedText>〜</ThemedText>
      <TextInput
        value={shiftType.endTime}
        onChangeText={(endTime) => upsertShiftType({ ...shiftType, endTime })}
        style={[inputStyle, styles.timeInput]}
      />
      <Pressable onPress={() => removeShiftType(shiftType.id)}>
        <ThemedText type="link">削除</ThemedText>
      </Pressable>
    </View>
  );
}

/** シフト種別・時間マスター画面: 早番/遅番/夜勤などの対応時間を編集・学習内容を確認 (requirements section 8). */
export default function ShiftTypesScreen() {
  const shiftTypes = useAppStore((state) => state.shiftTypes);
  const upsertShiftType = useAppStore((state) => state.upsertShiftType);

  const handleAdd = () => {
    upsertShiftType({
      id: `custom-${Date.now()}`,
      name: '新しい種別',
      startTime: '09:00',
      endTime: '18:00',
    });
  };

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        AIが解析した「早番」などの種別は、ここで登録した時間を次回以降の候補として使います。
      </ThemedText>
      <FlatList
        data={shiftTypes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ShiftTypeRow shiftType={item} />}
        contentContainerStyle={styles.list}
      />
      <PrimaryButton label="種別を追加" onPress={handleAdd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 14,
  },
  nameInput: {
    flex: 1,
  },
  timeInput: {
    width: 64,
  },
});
