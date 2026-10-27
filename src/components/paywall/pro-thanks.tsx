import {
  Check,
  LayoutGrid,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HakobuMascot } from '@/components/hakobu-mascot';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { usePaywallColors } from '@/hooks/use-paywall-colors';
import { useTheme } from '@/hooks/use-theme';
import { MAX_ADVANCED_SCANS, PRO_SCAN_LIMIT } from '@/utils/scanQuota';

import { PaywallHero } from './paywall-hero';
import { SpeechBubble } from './speech-bubble';

/** どうしてこの表示になったか。買った直後・復元できた直後・すでに PRO の人が開いた。 */
export type ProThanksReason = 'purchased' | 'restored' | 'active';

const TITLES: Record<ProThanksReason, string> = {
  purchased: 'PROになりました！',
  restored: 'PROを復元しました',
  active: 'PROをご利用中です',
};

/**
 * 主な3つと、どこで使うか（docs/ui-review/group-e.md「買った直後・回数切れ」）。価格は出さない。
 * 4行目に「その他さまざまなPRO機能」（2026-10-27 ユーザーの要望）。
 */
const PERKS: { icon: LucideIcon; tone: IconBadgeTone; title: string; where: string }[] = [
  {
    icon: ScanLine,
    tone: 'blue',
    title: `スキャン ${PRO_SCAN_LIMIT}回`,
    where: '写真選択の画面で',
  },
  {
    // 写真選択の「高度なスキャンする」ボタンと同じキラキラにそろえる（2026-10-26 ユーザー決定）
    icon: Sparkles,
    tone: 'gold',
    title: `高度なスキャン ${MAX_ADVANCED_SCANS}回`,
    where: '写真選択の画面で',
  },
  { icon: ShieldAlert, tone: 'orange', title: '扶養の壁アラート', where: '給与タブで' },
  {
    icon: LayoutGrid,
    tone: 'green',
    title: 'その他さまざまなPRO機能',
    // 幅375では1行に収まらないので、言葉の途中で折り返さないよう「・」のあとで改行する
    where: '過去の月の給与・掛け持ち・\n広告なしなど',
  },
];

/** 上部の高さ。4行目を足しても iPhone SE で「はじめる」まで見えるよう、Stitch の E（176pt）より低くした。 */
const HERO_HEIGHT = 156;

function PerkCard({ perk }: { perk: (typeof PERKS)[number] }) {
  const theme = useTheme();
  const colors = usePaywallColors();
  const tone = useIconBadgeColors(perk.tone);
  const Icon = perk.icon;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      accessible
      accessibilityLabel={`${perk.title}、${perk.where.replace('\n', '')}`}
    >
      <View style={[styles.cardIcon, { backgroundColor: tone.background }]}>
        <Icon size={24} color={tone.icon} strokeWidth={2} />
      </View>
      <View style={styles.cardText}>
        <ThemedText type="headline">{perk.title}</ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary">
          {perk.where}
        </ThemedText>
      </View>
      <View
        style={[
          styles.check,
          { backgroundColor: colors.checkBackground, borderColor: colors.checkBorder },
        ]}
      >
        <Check size={14} color={colors.checkIcon} strokeWidth={3} />
      </View>
    </View>
  );
}

/**
 * 課金画面の中で切り替えて出すお礼の表示（Stitch の E）。笑顔のはこブーと吹き出し、見出し、
 * 主な3つとどこで使うか・その他、「はじめる」（閉じる）。吹き出しは右のはこブーの方へしっぽを向ける。
 */
export function ProThanks({ reason, onStart }: { reason: ProThanksReason; onStart: () => void }) {
  const colors = usePaywallColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.scrollContent} bounces={false}>
        <PaywallHero height={HERO_HEIGHT} variant="thanks">
          <View style={styles.heroBubbleWrap}>
            <SpeechBubble text={'ありがとう！\nこれからもっと運ぶよ！'} tail="right" large />
          </View>
          <View style={styles.heroMascot}>
            <HakobuMascot pose="happy" size={120} />
          </View>
        </PaywallHero>

        <View style={styles.titleRow} accessible accessibilityRole="header">
          <Star size={20} color={colors.titleStar} fill={colors.titleStar} />
          <ThemedText type="title1">{TITLES[reason]}</ThemedText>
          <Star size={20} color={colors.titleStar} fill={colors.titleStar} />
        </View>

        <View style={styles.cards}>
          {PERKS.map((perk) => (
            <PerkCard key={perk.title} perk={perk} />
          ))}
        </View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(Spacing.three, insets.bottom + Spacing.two) },
        ]}
      >
        <PrimaryButton label="はじめる" onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.three,
  },
  // 吹き出しは右のはこブーに寄せ、しっぽの先が顔の横に来る高さに置く
  heroBubbleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: Spacing.three - Spacing.one,
    paddingBottom: 34,
  },
  heroMascot: {
    paddingRight: Spacing.three,
    marginBottom: -6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three + Spacing.one,
    paddingBottom: Spacing.three + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  cards: {
    gap: 10,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.smallLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
  },
});
