import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Camera, Check, Wallet } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { getCalendarProvider } from '@/services/calendar';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { deferNavigation } from '@/utils/deferNavigation';
import { formatShiftDate } from '@/utils/formatShift';

const CALENDAR_PROVIDER_LABEL = {
  apple: 'Apple カレンダー',
  google: 'Google カレンダー',
} as const;

/** 登録完了画面 (requirements section 17). */
export default function CompleteScreen() {
  const theme = useTheme();
  const providerBadgeColors = useIconBadgeColors('blue');
  const { count } = useLocalSearchParams<{ count: string }>();
  const provider = useAppStore((state) => {
    const user = state.user;
    const activeWorkplace =
      user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ?? user?.workplaces[0];
    return activeWorkplace?.settings.defaultCalendarProvider ?? 'apple';
  });
  const resetSession = useShiftSessionStore((state) => state.reset);
  const shifts = useShiftSessionStore((state) => state.shifts);
  const removedShiftIds = useShiftSessionStore((state) => state.removedShiftIds);

  const countLabel = count ?? '0';
  const providerLabel = CALENDAR_PROVIDER_LABEL[provider];

  // resetSession()はhandleDoneでのみ呼ばれるため、この画面が表示されている間は
  // 直前に登録したshiftsがまだセッションストアに残っている (fabricationではなく実データ)。
  const registeredDates = shifts
    .filter((shift) => !removedShiftIds.includes(shift.id))
    .map((shift) => shift.date)
    .sort();
  const dateRangeLabel =
    registeredDates.length === 0
      ? null
      : registeredDates.length === 1
        ? formatShiftDate(registeredDates[0])
        : `${formatShiftDate(registeredDates[0])}〜${formatShiftDate(registeredDates[registeredDates.length - 1])}`;

  const handleOpenCalendar = async () => {
    await getCalendarProvider(provider).openCalendarApp();
  };

  const handleDone = () => {
    resetSession();
    deferNavigation(() => router.replace('/'));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.center}>
          <View style={styles.successIconWrap}>
            <View style={[styles.successHalo, { backgroundColor: theme.success, opacity: 0.2 }]} />
            <View style={[styles.successCircle, { backgroundColor: theme.success }]}>
              <Check size={IconSize.large} color={theme.onPrimary} strokeWidth={3} />
            </View>
          </View>
          <ThemedText type="title2" style={styles.centerText}>
            カレンダー登録が完了しました
          </ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.centerText}>
            {countLabel}件のシフト予定を{providerLabel}に正常に追加しました。
          </ThemedText>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              <ThemedText type="subheadline" themeColor="textSecondary">
                登録先
              </ThemedText>
            </View>
            <View style={styles.summaryValue}>
              <Calendar size={19} color={providerBadgeColors.icon} />
              <ThemedText type="subheadline" style={styles.summaryValueText} numberOfLines={1}>
                {providerLabel}
              </ThemedText>
            </View>
          </View>
          {dateRangeLabel && (
            <View
              style={[styles.summaryRow, styles.summaryRowBorder, { borderTopColor: theme.border }]}
            >
              <ThemedText type="subheadline" themeColor="textSecondary">
                対象期間
              </ThemedText>
              <ThemedText type="subheadline" style={styles.summaryValueText}>
                {dateRangeLabel}
              </ThemedText>
            </View>
          )}
          <View
            style={[styles.summaryRow, styles.summaryRowBorder, { borderTopColor: theme.border }]}
          >
            <ThemedText type="subheadline" themeColor="textSecondary">
              登録件数
            </ThemedText>
            <ThemedText type="subheadline" style={styles.summaryValueBold}>
              {countLabel}件
            </ThemedText>
          </View>
        </View>

        <View style={styles.tips}>
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.tipsCaption}>
            次回からの使い方
          </ThemedText>
          <View style={[styles.tipsCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.tipRow}>
              <IconBadge tone="blue" size={32}>
                <Camera size={IconSize.small} color={providerBadgeColors.icon} />
              </IconBadge>
              <ThemedText type="subheadline" style={styles.tipText}>
                新しいシフト表が配られたら「スキャン」から撮影するだけ
              </ThemedText>
            </View>
            <View style={[styles.tipSeparator, { backgroundColor: theme.border }]} />
            <View style={styles.tipRow}>
              <IconBadge tone="blue" size={32}>
                <Wallet size={IconSize.small} color={providerBadgeColors.icon} />
              </IconBadge>
              <ThemedText type="subheadline" style={styles.tipText}>
                給与見込みは「給与」タブでいつでも確認できます
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="カレンダーを確認する" onPress={handleOpenCalendar} />
          <Pressable onPress={handleDone} style={styles.doneLink} hitSlop={Spacing.two}>
            <ThemedText type="headline" themeColor="primary">
              ホームに戻る
            </ThemedText>
          </Pressable>
        </View>

        <AdPlaceholder slot="complete" style={styles.ad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  successIconWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  successHalo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: Radius.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  summaryRowBorder: {
    borderTopWidth: 1,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  summaryValueText: {
    fontWeight: '500',
    flexShrink: 1,
  },
  summaryValueBold: {
    fontWeight: '700',
  },
  tips: {
    gap: Spacing.two,
  },
  tipsCaption: {
    paddingHorizontal: Spacing.one,
  },
  tipsCard: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  tipSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  tipText: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
  },
  doneLink: {
    alignItems: 'center',
    padding: Spacing.two,
  },
  ad: {
    marginTop: Spacing.two,
  },
});
