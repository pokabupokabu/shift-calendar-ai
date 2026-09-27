import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CalendarProviderId } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { ensureCalendarAccess } from '@/services/calendar/ensureCalendarAccess';
import { useAppStore } from '@/store/useAppStore';

const PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
};

/**
 * カレンダーごとの連携専用ページ。
 * Apple/Google両方の実認証・権限リクエスト(ensureCalendarAccess)に接続済み。
 * Google認証はカスタムスキームのネイティブリダイレクトに依存するため、
 * Expo Go/Expo Webでは動作しない(失敗時はAlertでその旨が表示される)。
 */
export default function CalendarConnectScreen() {
  const { provider } = useLocalSearchParams<{ provider: CalendarProviderId }>();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const label = PROVIDER_LABEL[provider] ?? provider;

  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const calendarProvider = getCalendarProvider(provider);
      if (!(await ensureCalendarAccess(calendarProvider))) return;
      updateSettings({ defaultCalendarProvider: provider });
      router.back();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="subtitle">{label}と連携</ThemedText>
      <View style={styles.body}>
        <ThemedText themeColor="textSecondary">
          {label}への登録を許可すると、シフトの登録先としてすぐに使えるようになります。
        </ThemedText>
      </View>
      <PrimaryButton
        label={connecting ? '連携中…' : '連携する'}
        onPress={handleConnect}
        disabled={connecting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: Spacing.two,
  },
});
