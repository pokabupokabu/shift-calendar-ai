import { ChevronRight, Play, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Dialog } from '@/components/dialog';
import { HakobuMascot } from '@/components/hakobu-mascot';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { FALLBACK_PRO_PRICE } from '@/constants/pro-plan';
import { Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { usePaywallColors } from '@/hooks/use-paywall-colors';
import { useTheme } from '@/hooks/use-theme';
import { getProPriceString } from '@/utils/purchases';
import { MAX_ADVANCED_SCANS, PRO_SCAN_LIMIT } from '@/utils/scanQuota';

/**
 * 写真選択でスキャンの回数を使い切ったときの小窓（docs/ui-review/group-e.md。Stitch の F・G）。
 * 困った顔のはこブーと、いつ何回戻るか。広告を見られるときは「広告を見て1回スキャン」と「PROにする」の
 * 2枚のカード、見られないときは「PROにする」だけ。どちらも「あとにする」で閉じる。
 * 押したあとの動き（広告・課金画面）は、小窓が閉じきってから呼び出し側で始める（`onDismiss`）。
 */
export function QuotaExceededDialog({
  visible,
  canWatchAd,
  recoveryText,
  onWatchAd,
  onGoPro,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  /** 広告を見て1回足せるか */
  canWatchAd: boolean;
  /** 「11月5日に4回分戻ります」のような一文。戻る日が無いときは null（札を出さない） */
  recoveryText: string | null;
  onWatchAd: () => void;
  onGoPro: () => void;
  /** 「あとにする」・外側を押したとき */
  onClose: () => void;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const colors = usePaywallColors();
  const blue = useIconBadgeColors('blue');
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getProPriceString().then((price) => {
      if (!cancelled) setPriceString(price);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Dialog visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <View style={styles.header}>
        <HakobuMascot pose="puzzled" size={88} />
        {/* 「、」のあとで改行して、言葉の途中で折り返さないようにする */}
        <ThemedText type="headline" style={styles.centerText}>
          {'ごめんね、\nしばらくはもう運べないんだ'}
        </ThemedText>
        {recoveryText && (
          <View style={[styles.pill, { backgroundColor: colors.pillBackground }]}>
            <ThemedText type="footnote" style={{ color: colors.pillText }}>
              {recoveryText}
            </ThemedText>
          </View>
        )}
      </View>

      {canWatchAd && (
        <Pressable
          accessibilityRole="button"
          onPress={onWatchAd}
          style={({ pressed }) => [
            styles.card,
            styles.adCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <IconBadge tone="blue" size={36}>
            <Play size={16} color={blue.icon} fill={blue.icon} />
          </IconBadge>
          <View style={styles.cardText}>
            <ThemedText
              type="headline"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={styles.cardTitle}
            >
              広告を見て1回スキャン
            </ThemedText>
            <ThemedText type="footnote" themeColor="textSecondary">
              今すぐ続きを読み取れます
            </ThemedText>
          </View>
          <ChevronRight size={18} color={theme.textSecondary} />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onGoPro}
        style={({ pressed }) => [
          styles.card,
          styles.proCard,
          {
            backgroundColor: colors.proCardBackground,
            borderColor: colors.proCardBorder,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.proCardTop}>
          <Star size={16} color={colors.proCardStar} fill={colors.proCardStar} />
          <ThemedText
            type="headline"
            style={[styles.cardTitle, styles.flex, { color: colors.proCardTitle }]}
          >
            PROにする
          </ThemedText>
          <ThemedText type="headline" style={[styles.cardTitle, { color: colors.proCardPrice }]}>
            {`${priceString ?? FALLBACK_PRO_PRICE}/月`}
          </ThemedText>
        </View>
        <ThemedText type="footnote" themeColor="textSecondary">
          {`スキャン${PRO_SCAN_LIMIT}回・高度なスキャン${MAX_ADVANCED_SCANS}回`}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [styles.laterButton, { opacity: pressed ? 0.5 : 1 }]}
      >
        <ThemedText type="body" themeColor="textSecondary">
          あとにする
        </ThemedText>
      </Pressable>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  // 小窓の内側の幅（SE で約279pt）に「広告を見て1回スキャン」を1行で収めるため、余白と文字を少し詰める
  card: {
    borderRadius: Radius.medium,
    padding: 12,
  },
  adCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  proCard: {
    borderWidth: 2,
    gap: Spacing.one,
  },
  proCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  laterButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.two,
  },
});
