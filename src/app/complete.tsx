import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { deferNavigation } from '@/utils/deferNavigation';

/** 登録完了画面 (requirements section 17). */
export default function CompleteScreen() {
  const theme = useTheme();
  const { count } = useLocalSearchParams<{ count: string }>();
  const provider = useAppStore((state) => state.user?.settings.defaultCalendarProvider ?? 'apple');
  const resetSession = useShiftSessionStore((state) => state.reset);

  const handleOpenCalendar = async () => {
    await getCalendarProvider(provider).openCalendarApp();
  };

  const handleDone = () => {
    resetSession();
    deferNavigation(() => router.replace('/'));
  };

  return (
    <Screen style={styles.center}>
      <CircleCheck size={IconSize.xlarge} color={theme.success} />
      <ThemedText type="subtitle">{count ?? 0}件のシフトをカレンダーに追加しました</ThemedText>
      <PrimaryButton label="カレンダーを見る" onPress={handleOpenCalendar} />
      <PrimaryButton label="完了" onPress={handleDone} />
      <AdPlaceholder slot="complete" style={styles.ad} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  ad: {
    marginTop: Spacing.four,
  },
});
