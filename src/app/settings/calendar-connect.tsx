import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CalendarProviderId } from '@/models';
import { useAppStore } from '@/store/useAppStore';

const PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
};

/**
 * カレンダーごとの連携専用ページ (仮実装)。
 * 本来はここで各CalendarProviderのauthenticate()/権限リクエストを呼ぶが、
 * 今回は画面遷移とUIのみ用意し、実際の認証呼び出しはまだ繋いでいない。
 * 「連携する」を押すと連携済み扱いにしてテンプレタブへ戻る。
 */
export default function CalendarConnectScreen() {
  const { provider } = useLocalSearchParams<{ provider: CalendarProviderId }>();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const label = PROVIDER_LABEL[provider] ?? provider;

  const handleConnect = () => {
    updateSettings({ defaultCalendarProvider: provider });
    router.replace('/template');
  };

  return (
    <Screen>
      <ThemedText type="subtitle">{label}と連携</ThemedText>
      <View style={styles.body}>
        <ThemedText themeColor="textSecondary">
          {label}への登録を許可すると、シフトの登録先としてすぐに使えるようになります。
        </ThemedText>
      </View>
      <PrimaryButton label="連携する" onPress={handleConnect} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: Spacing.two,
  },
});
