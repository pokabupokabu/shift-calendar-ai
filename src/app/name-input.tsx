import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

/** 名前入力画面 (requirements section 3 step 2, section 7). */
export default function NameInputScreen() {
  const theme = useTheme();
  const savedShiftName = useAppStore((state) => state.user?.shiftName);
  const savedHasNoNames = useAppStore((state) => state.user?.shiftTableHasNoNames ?? false);
  const setShiftName = useAppStore((state) => state.setShiftName);
  const setShiftTableHasNoNames = useAppStore((state) => state.setShiftTableHasNoNames);
  const [name, setName] = useState(savedShiftName ?? '');
  const [hasNoNames, setHasNoNames] = useState(savedHasNoNames);

  // 名前が載っていない表を選んだ人は名前を入力しようがないので、そこで先へ進めなくしない。
  const canProceed = hasNoNames || name.trim().length > 0;

  const handleNext = () => {
    setShiftTableHasNoNames(hasNoNames);
    setShiftName(hasNoNames ? '' : name.trim());
    router.push('/photo-select');
  };

  return (
    <Screen>
      <ThemedText type="subtitle">シフト表に書かれているあなたの名前は？</ThemedText>
      <ThemedText themeColor="textSecondary">
        AIがこの名前でシフト表からあなたの行を探します。あとから設定画面で変更できます。
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="例：永尾"
        placeholderTextColor={theme.textSecondary}
        editable={!hasNoNames}
        style={[
          styles.input,
          {
            color: hasNoNames ? theme.textSecondary : theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        autoFocus={!hasNoNames}
      />

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabel}>
          <ThemedText type="body">シフト表に名前が載っていない</ThemedText>
          <ThemedText type="footnote" themeColor="textSecondary">
            自分専用の勤務表やカレンダー形式など、人の名前が書かれていないシフト表はこちら。表に載っている勤務をすべてあなたのものとして読み取ります。
          </ThemedText>
        </View>
        <Switch value={hasNoNames} onValueChange={setHasNoNames} />
      </View>

      <PrimaryButton label="次へ" onPress={handleNext} disabled={!canProceed} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  toggleLabel: {
    flex: 1,
    gap: Spacing.one,
  },
});
