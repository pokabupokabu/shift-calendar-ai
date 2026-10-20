import { Sprout, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

import { IconBadge } from './icon-badge';
import { ThemedText } from './themed-text';

const STATUS_ICON_BADGE_SIZE = 32;
const STATUS_ICON_SIZE = 18;

/**
 * 全タブの見出しの右に置く「アイコン＋プランの札」（docs/ui-review/group-a.md サブグループ⑤）。
 * 左にアイコン（無料＝青い丸に若葉／PRO＝金の丸に星）、右に札（無料＝灰色／PRO＝金）。
 * 表示名をやめた代わりに、今のプランが分かるようにするだけの表示で、押せない
 * （Pressable にせず、読み上げもボタンではなく「無料プラン」「PROプラン」の1つの文として扱う）。
 */
export function HeaderStatus() {
  const theme = useTheme();
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const blueBadge = useIconBadgeColors('blue');
  const goldBadge = useIconBadgeColors('gold');

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={isPro ? 'PROプラン' : '無料プラン'}
      style={styles.container}
    >
      {isPro ? (
        <IconBadge tone="gold" size={STATUS_ICON_BADGE_SIZE}>
          <Star size={STATUS_ICON_SIZE} color={goldBadge.icon} fill={goldBadge.icon} />
        </IconBadge>
      ) : (
        <IconBadge tone="blue" size={STATUS_ICON_BADGE_SIZE}>
          <Sprout size={STATUS_ICON_SIZE} color={blueBadge.icon} />
        </IconBadge>
      )}
      <View
        style={[styles.planTag, { backgroundColor: isPro ? theme.gold : theme.backgroundSelected }]}
      >
        <ThemedText
          type="caption1"
          style={[styles.planTagLabel, { color: isPro ? theme.onGold : theme.textSecondary }]}
        >
          {isPro ? 'PRO' : '無料'}
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * タブの大見出し（`title1`・28pt）の行。左に見出し、右端に `HeaderStatus`。
 * カレンダー・給与・マイカスタム・設定の4タブで共通に使う。
 */
export function TabTitleRow({ title }: { title: string }) {
  return (
    <View style={styles.titleRow}>
      <ThemedText type="title1" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      <HeaderStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
  },
  planTagLabel: {
    fontWeight: '700',
  },
});
