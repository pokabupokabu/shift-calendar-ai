import { router } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HakobuMascot } from '@/components/hakobu-mascot';
import { ComparisonTable } from '@/components/paywall/comparison-table';
import { PaywallHero } from '@/components/paywall/paywall-hero';
import { ProThanks, type ProThanksReason } from '@/components/paywall/pro-thanks';
import { ProTitle } from '@/components/paywall/pro-title';
import { SpeechBubble } from '@/components/paywall/speech-bubble';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { FALLBACK_PRO_PRICE, yearlyEstimateLabel } from '@/constants/pro-plan';
import { Radius, Spacing } from '@/constants/theme';
import { usePaywallColors } from '@/hooks/use-paywall-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';
import { getProPriceString, purchasePro, restorePurchases } from '@/utils/purchases';

/**
 * 上部の高さ。Stitch の B は約150pt だったが、下の帯に「購入を復元する」の行を足したぶん、
 * iPhone SE で表と帯が下へ送らずに見えるよう低くした（2026-10-27 ユーザー決定。docs/ui-review/group-e.md）。
 */
const HERO_HEIGHT = 122;

/**
 * 特定商取引法12条の6（特定申込みを受ける際の表示）が「最終確認画面」に求める事項。
 * Apple IAPでは決済シートの直前にあるこの画面が最終確認画面に当たると解されるため、
 * 申込みの内容をこの画面から分かるようにしておく必要がある
 * （消費者庁「通信販売の申込み段階における表示についてのガイドライン」）。
 * Apple App Store Review Guideline 3.1.2 の開示要件ともほぼ重なる。
 * - 価格と分量（1か月ごと・自動更新）は、下の帯の一文と申し込むボタンに出す。定期購入の条件をボタンの下に
 *   置くと誤認のおそれがある（同ガイドライン脚注10）ため、自動更新の一文はボタンの上に置く
 * - ここには要点（提供期間と1年の目安・解約方法・返金）だけを出し、支払方法・提供開始などの詳細は
 *   特商法の表記ページを参照する（同ガイドラインは、参照先をはっきり示せばリンク先に詳細を置いてよいとしている）
 * （docs/ui-review/group-e.md「コミット前の直し」）
 */
/** 前後で折り返さないための、幅0のつなぐ記号（U+2060）。 */
const WORD_JOINER = String.fromCharCode(0x2060);

function subscriptionTerms(price: string): { label: string; value: string }[] {
  // 1年続けた場合の目安は、自動更新・無期限の契約で示すのが望ましいとされる（同ガイドライン）。
  // 価格から計算できるときだけ出す。「3,960」と「円」の間で折り返さないよう、つなぐ記号（幅0）を入れる
  // 言葉の途中で折り返さないよう、幅375で収まる位置に改行を入れてある
  const yearly = yearlyEstimateLabel(price);
  return [
    {
      label: '提供期間',
      value: `1か月ごとの自動更新。解約するまで継続します${
        yearly ? `\n（1年続けた場合の目安は${yearly.replace('円', WORD_JOINER + '円')}）` : ''
      }`,
    },
    {
      label: '解約方法',
      value: '更新日の24時間前までに、iPhoneの「設定」→\nユーザ名 →「サブスクリプション」から',
    },
    { label: '返金', value: '提供開始後の中途解約による返金はいたしかねます' },
  ];
}

/** 下の帯の、灰色の小さな文字のリンク。押せる高さは44pt。 */
function FooterLink({
  label,
  onPress,
  disabled,
  size,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size: 'restore' | 'legal';
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={size === 'restore' ? 'button' : 'link'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.footerLink, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Text
        style={[
          size === 'restore' ? styles.restoreLabel : styles.legalLabel,
          { color: theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FooterSeparator() {
  const theme = useTheme();
  return <Text style={[styles.legalLabel, { color: theme.textSecondary }]}>・</Text>;
}

/**
 * 課金画面（docs/ui-review/group-e.md。Stitch の B（濃い金）と D（ダーク））。
 * 上のバーは出さず、右上の丸い×で閉じる。買えた・復元できたら、同じ画面の中でお礼の表示に切り替える。
 */
export default function PaywallScreen() {
  const theme = useTheme();
  const colors = usePaywallColors();
  const insets = useSafeAreaInsets();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // この画面で買えた・復元できたとき。すでに PRO の人が開いたときは「ご利用中」のお礼の形にする
  const [completed, setCompleted] = useState<Exclude<ProThanksReason, 'active'> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProPriceString().then((price) => {
      if (!cancelled) setPriceString(price);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const price = priceString ?? FALLBACK_PRO_PRICE;
  const busy = purchasing || restoring;

  const handlePurchase = async () => {
    setPurchasing(true);
    const result = await purchasePro();
    setPurchasing(false);
    if (result.success) {
      setCompleted('purchased');
    } else if (result.error) {
      Alert.alert('購入できませんでした', result.error);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.success) {
      setCompleted('restored');
    } else {
      Alert.alert('復元できませんでした', result.error);
    }
  };

  const thanksReason: ProThanksReason | null = completed ?? (isPro ? 'active' : null);
  if (thanksReason) {
    return <ProThanks reason={thanksReason} onStart={() => router.back()} />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent}>
        <PaywallHero height={HERO_HEIGHT} variant="purchase" onClose={() => router.back()}>
          <View style={styles.heroMascot}>
            <HakobuMascot pose="running" size={90} />
          </View>
          {/* 「、」のあとで改行して、言葉の途中で折り返さないようにする */}
          <SpeechBubble
            text={'キミのシフト、\nもっとたくさん届けさせて！'}
            tail="left"
            large
            style={styles.heroBubble}
          />
        </PaywallHero>

        <View style={styles.title}>
          <ProTitle />
        </View>

        <View style={styles.tableSection}>
          <ComparisonTable />
          <ThemedText type="caption1" themeColor="textSecondary" style={styles.tableNote}>
            スキャンの回数は15日ごとに戻ります
          </ThemedText>
        </View>

        <View
          style={[
            styles.terms,
            { backgroundColor: colors.termsBackground, borderColor: colors.termsBorder },
          ]}
        >
          <View style={styles.termsHeading}>
            <FileText size={12} color={theme.textSecondary} strokeWidth={2} />
            <Text style={[styles.termsHeadingLabel, { color: theme.text }]}>
              お申し込み内容の確認
            </Text>
          </View>
          {subscriptionTerms(price).map((term) => (
            <Text key={term.label} style={[styles.termText, { color: theme.text }]}>
              <Text style={styles.termLabel}>{term.label}：</Text>
              {term.value}
            </Text>
          ))}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/settings/legal/tokushoho')}
            style={({ pressed }) => [styles.termsLink, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={[styles.termsLinkLabel, { color: theme.primary }]}>
              詳しい条件は特定商取引法に基づく表記へ
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 下に固定の購入の帯。自動更新の一文 → 申し込むボタン → 購入を復元する → 規約などのリンク */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.barBackground,
            borderTopColor: colors.barBorder,
            // 下のリンクの行は44ptの中に余白を含むので、ホームバーの分と少し重ねる
            paddingBottom: Math.max(0, insets.bottom - Spacing.three),
          },
        ]}
      >
        <Text style={[styles.barNotice, { color: theme.text }]}>
          税込・1か月ごとの自動更新。解約するまで毎月続きます
        </Text>
        <PrimaryButton
          label={purchasing ? '処理中…' : `${price}/月でPROに申し込む`}
          onPress={handlePurchase}
          disabled={busy}
          variant="bluePill"
        />
        <View style={styles.footerRow}>
          <FooterLink
            size="restore"
            label={restoring ? '復元中…' : '購入を復元する'}
            onPress={handleRestore}
            disabled={busy}
          />
        </View>
        <View style={styles.footerRow}>
          <FooterLink
            size="legal"
            label="利用規約"
            onPress={() => router.push('/settings/legal/terms')}
          />
          <FooterSeparator />
          <FooterLink
            size="legal"
            label="プライバシー"
            onPress={() => router.push('/settings/legal/privacy')}
          />
          <FooterSeparator />
          <FooterLink
            size="legal"
            label="特商法"
            onPress={() => router.push('/settings/legal/tokushoho')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  heroMascot: {
    paddingLeft: Spacing.three,
    paddingBottom: 6,
  },
  // 吹き出しは右上の×（押せる範囲は上から48ptまで）に重ならない高さに置く
  heroBubble: {
    marginLeft: Spacing.three - Spacing.one,
    marginBottom: 10,
  },
  title: {
    paddingTop: Spacing.two,
    paddingBottom: 6,
    paddingHorizontal: Spacing.three,
  },
  tableSection: {
    paddingHorizontal: Spacing.three,
  },
  tableNote: {
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '400',
  },
  terms: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.three,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.one,
  },
  termsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.half,
  },
  termsHeadingLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  termText: {
    fontSize: 11,
    lineHeight: 15,
  },
  termLabel: {
    fontWeight: '600',
  },
  termsLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  termsLinkLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  barNotice: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    minHeight: 44,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  restoreLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  legalLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
});
