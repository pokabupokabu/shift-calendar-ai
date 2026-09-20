import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';

/** 登録完了画面 (requirements section 17). */
export default function CompleteScreen() {
  const { count } = useLocalSearchParams<{ count: string }>();
  const provider = useAppStore((state) => state.user?.settings.defaultCalendarProvider ?? 'apple');
  const resetSession = useShiftSessionStore((state) => state.reset);

  const handleOpenCalendar = async () => {
    await getCalendarProvider(provider).openCalendarApp();
  };

  const handleDone = () => {
    resetSession();
    router.replace('/');
  };

  return (
    <Screen style={styles.center}>
      <ThemedText type="title">✓</ThemedText>
      <ThemedText type="subtitle">{count ?? 0}件のシフトをカレンダーに追加しました</ThemedText>
      <PrimaryButton label="カレンダーを見る" onPress={handleOpenCalendar} />
      <PrimaryButton label="完了" onPress={handleDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
