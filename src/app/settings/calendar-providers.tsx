import { Check, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProviderId } from '@/models';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';

const PROVIDERS: { id: CalendarProviderId; label: string }[] = [
  { id: 'apple', label: 'Apple カレンダー' },
  { id: 'google', label: 'Google カレンダー' },
];

/**
 * 対応カレンダー一覧: 未連携のものを選ぶと、そのカレンダー専用の連携ページ (calendar-connect)
 * に遷移する。画面遷移とUIのみで、実際の認証呼び出しはまだ繋いでいない (仮実装)。
 */
export default function CalendarProvidersScreen() {
  const theme = useTheme();
  const [connectedIds, setConnectedIds] = useState<CalendarProviderId[]>(['apple']);

  useEffect(() => {
    getConnectedProviders().then(setConnectedIds);
  }, []);

  return (
    <Screen>
      <ThemedText type="subtitle">対応カレンダー</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        連携したいカレンダーを選ぶと、連携専用のページに進みます。
      </ThemedText>

      <Card style={styles.group}>
        {PROVIDERS.map((provider, index) => {
          const isConnected = connectedIds.includes(provider.id);
          return (
            <Pressable
              key={provider.id}
              disabled={isConnected}
              onPress={() =>
                router.push({
                  pathname: '/settings/calendar-connect',
                  params: { provider: provider.id },
                })
              }
              style={[styles.row, index > 0 && styles.rowBorder, { borderTopColor: theme.border }]}
            >
              <ThemedText style={styles.rowLabel}>{provider.label}</ThemedText>
              {isConnected ? (
                <View style={styles.connectedTag}>
                  <Check size={IconSize.small} color={theme.success} />
                  <ThemedText type="small" themeColor="success">
                    連携済み
                  </ThemedText>
                </View>
              ) : (
                <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  rowBorder: {
    borderTopWidth: 1,
  },
  rowLabel: {
    flex: 1,
  },
  connectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
