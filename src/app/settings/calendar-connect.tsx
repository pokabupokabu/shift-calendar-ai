import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProviderId } from '@/models';
import { getCalendarProvider } from '@/services/calendar';
import { ensureCalendarAccess } from '@/services/calendar/ensureCalendarAccess';
import { useAppStore } from '@/store/useAppStore';

const PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
};

const PROVIDER_TONE: Record<CalendarProviderId, IconBadgeTone> = {
  apple: 'neutral',
  google: 'blue',
};

/**
 * カレンダーごとの連携専用ページ。
 * Apple/Google両方の実認証・権限リクエスト(ensureCalendarAccess)に接続済み。
 * Google認証はカスタムスキームのネイティブリダイレクトに依存するため、
 * Expo Go/Expo Webでは動作しない(失敗時はAlertでその旨が表示される)。
 */
export default function CalendarConnectScreen() {
  const theme = useTheme();
  const { provider } = useLocalSearchParams<{ provider: CalendarProviderId }>();
  const user = useAppStore((state) => state.user);
  const updateWorkplaceSettings = useAppStore((state) => state.updateWorkplaceSettings);
  const activeWorkplace =
    user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ?? user?.workplaces[0];
  const label = PROVIDER_LABEL[provider] ?? provider;
  const tone = PROVIDER_TONE[provider] ?? 'neutral';
  const badgeColors = useIconBadgeColors(tone);

  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!activeWorkplace) return;
    setConnecting(true);
    try {
      const calendarProvider = getCalendarProvider(provider);
      if (!(await ensureCalendarAccess(calendarProvider))) return;
      updateWorkplaceSettings(activeWorkplace.id, { defaultCalendarProvider: provider });
      router.back();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="subtitle">{label}と連携</ThemedText>
      <View style={styles.body}>
        <Card style={styles.iconCard}>
          <IconBadge tone={tone} size={64}>
            <CalendarCheck size={32} color={badgeColors.icon} />
          </IconBadge>
          <ThemedText type="headline" style={styles.cardTitle}>
            {label}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.cardDescription}>
            {label}への登録を許可すると、シフトの登録先としてすぐに使えるようになります。
          </ThemedText>
        </Card>

        <View style={styles.noteRow}>
          <ShieldCheck size={16} color={theme.textSecondary} />
          <ThemedText type="footnote" themeColor="textSecondary" style={styles.noteLabel}>
            権限は後からいつでも変更できます。
          </ThemedText>
        </View>
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
    gap: Spacing.three,
    justifyContent: 'center',
  },
  iconCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  cardTitle: {
    textAlign: 'center',
  },
  cardDescription: {
    textAlign: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  noteLabel: {
    textAlign: 'center',
  },
});
