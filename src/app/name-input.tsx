import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

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
  const setShiftName = useAppStore((state) => state.setShiftName);
  const [name, setName] = useState(savedShiftName ?? '');

  const handleNext = () => {
    setShiftName(name.trim());
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
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        autoFocus
      />
      <PrimaryButton label="次へ" onPress={handleNext} disabled={name.trim().length === 0} />
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
});
