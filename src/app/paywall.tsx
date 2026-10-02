import { CheckCircle2, Star } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

const FEATURES = [
  '月別の勤務時間・給与を自動集計',
  '給与見込みをテンプレートごとに確認',
  '広告を非表示',
  '画像シフト読み取り枠が無制限',
];

function showComingSoon() {
  Alert.alert('準備中', 'この機能は近日公開予定です。');
}

export default function PaywallScreen() {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: theme.orange }]}>
            <Star size={28} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <ThemedText type="title2" style={styles.title}>
            シフトカレンダーAI PRO
          </ThemedText>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.subtitle}>
            月別集計・給与見込みに加え、広告の非表示や画像シフト読み取り枠の拡大が無制限で利用できます。
          </ThemedText>
        </View>

        <View style={[styles.featureList, { backgroundColor: theme.backgroundElement }]}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <CheckCircle2 size={20} color={theme.success} />
              <ThemedText style={styles.featureLabel}>{feature}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.priceRow}>
          <ThemedText style={styles.priceAmount}>¥300</ThemedText>
          <ThemedText style={[styles.priceUnit, { color: theme.textSecondary }]}>/ 月</ThemedText>
        </View>

        {isPro ? (
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.subtitle}>
            すでにProプランをご利用中です
          </ThemedText>
        ) : (
          <PrimaryButton label="アップグレード" onPress={showComingSoon} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  featureList: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  featureLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
  },
  priceAmount: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 12,
    lineHeight: 16,
  },
});
