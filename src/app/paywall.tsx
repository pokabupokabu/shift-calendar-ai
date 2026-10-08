import { router } from 'expo-router';
import { CheckCircle2, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { getProPriceString, purchasePro, restorePurchases } from '@/utils/purchases';

const FEATURES = [
  '月別の勤務時間・給与を自動集計',
  '給与見込みをテンプレートごとに確認',
  '広告を非表示',
  '画像シフト読み取り枠が無制限',
];

const FALLBACK_PRICE = '¥300';

/**
 * 特定商取引法12条の6（特定申込みを受ける際の表示）が「最終確認画面」に求める事項。
 * Apple IAPでは決済シートの直前にあるこの画面が最終確認画面に当たると解されるため、
 * 特商法表記ページへのリンクだけでは足りず、ここに実体を表示する必要がある
 * （消費者庁「通信販売の申込み段階における表示についてのガイドライン」）。
 * Apple App Store Review Guideline 3.1.2 の開示要件ともほぼ重なる。
 */
function subscriptionTerms(price: string): { label: string; value: string }[] {
  return [
    { label: '契約内容', value: 'シフトカレンダーAI PRO（本アプリの全機能）' },
    {
      label: '提供期間',
      value: '1か月ごとの自動更新。解約を申し出るまで継続する無期限契約です',
    },
    { label: '料金', value: `${price} / 月（税込）` },
    {
      label: '支払方法',
      value: 'Apple ID（App Store）決済。購入時および以後毎月の更新日に課金されます',
    },
    { label: '提供開始', value: '購入手続きの完了後、ただちにご利用いただけます' },
    {
      label: '解約方法',
      value:
        '更新日の24時間前までに、iPhoneの「設定」→ Apple ID → サブスクリプションから解約してください',
    },
    {
      label: '返金',
      value: 'デジタルコンテンツの性質上、提供開始後の中途解約による返金はいたしかねます',
    },
  ];
}

export default function PaywallScreen() {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProPriceString().then((price) => {
      if (!cancelled) setPriceString(price);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePurchase = async () => {
    setPurchasing(true);
    const result = await purchasePro();
    setPurchasing(false);
    if (result.error) {
      Alert.alert('購入できませんでした', result.error);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    Alert.alert(result.success ? '復元しました' : '復元できませんでした', result.error);
  };

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
          <ThemedText style={styles.priceAmount}>{priceString ?? FALLBACK_PRICE}</ThemedText>
          <ThemedText style={[styles.priceUnit, { color: theme.textSecondary }]}>/ 月</ThemedText>
        </View>

        {isPro ? (
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.subtitle}>
            すでにProプランをご利用中です
          </ThemedText>
        ) : (
          <>
            <PrimaryButton
              label={purchasing ? '処理中…' : 'アップグレード'}
              onPress={handlePurchase}
              disabled={purchasing || restoring}
            />
            <Pressable
              onPress={handleRestore}
              disabled={purchasing || restoring}
              hitSlop={Spacing.two}
            >
              {restoring ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="footnote" themeColor="primary" style={styles.restoreLabel}>
                  購入を復元する
                </ThemedText>
              )}
            </Pressable>
          </>
        )}

        <View style={[styles.disclosure, { borderTopColor: theme.border }]}>
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.disclosureHeading}>
            お申し込み内容の確認
          </ThemedText>
          {subscriptionTerms(priceString ?? FALLBACK_PRICE).map((term) => (
            <View key={term.label} style={styles.termRow}>
              <ThemedText type="caption1" themeColor="textSecondary" style={styles.termLabel}>
                {term.label}
              </ThemedText>
              <ThemedText type="caption1" themeColor="textSecondary" style={styles.termValue}>
                {term.value}
              </ThemedText>
            </View>
          ))}
          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/settings/legal/terms')} hitSlop={Spacing.two}>
              <ThemedText type="caption1" themeColor="primary">
                利用規約
              </ThemedText>
            </Pressable>
            <ThemedText type="caption1" themeColor="textSecondary">
              ・
            </ThemedText>
            <Pressable onPress={() => router.push('/settings/legal/privacy')} hitSlop={Spacing.two}>
              <ThemedText type="caption1" themeColor="primary">
                プライバシーポリシー
              </ThemedText>
            </Pressable>
            <ThemedText type="caption1" themeColor="textSecondary">
              ・
            </ThemedText>
            <Pressable
              onPress={() => router.push('/settings/legal/tokushoho')}
              hitSlop={Spacing.two}
            >
              <ThemedText type="caption1" themeColor="primary">
                特定商取引法に基づく表記
              </ThemedText>
            </Pressable>
          </View>
        </View>
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
  restoreLabel: {
    textAlign: 'center',
  },
  disclosure: {
    gap: Spacing.one,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disclosureHeading: {
    fontWeight: '600',
    paddingBottom: Spacing.half,
  },
  termRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  termLabel: {
    width: 68,
    flexShrink: 0,
  },
  termValue: {
    flex: 1,
    minWidth: 0,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
