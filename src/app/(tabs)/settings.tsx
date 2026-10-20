import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  LifeBuoy,
  MessageCircle,
  Palette,
  ShieldCheck,
  Star,
  TriangleAlert,
  UserCog,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { TabTitleRow } from '@/components/header-status';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProviderId } from '@/models/calendarEvent';
import { useAppStore } from '@/store/useAppStore';

interface SettingsRow {
  icon: LucideIcon;
  tone: IconBadgeTone;
  label: string;
  /** 登録先カレンダーの「Apple」のように、chevronの手前に添える今の設定（灰色の小さな文字）。 */
  trailingLabel?: string;
  /** タップ時の遷移先。全ての行が遷移先を持つ（未実装の行は置かない）。 */
  route: Href;
}

const ROW_ICON_BADGE_SIZE = 28;
const ROW_ICON_SIZE = 18;

const ACCOUNT_ROWS: SettingsRow[] = [
  { icon: UserCog, tone: 'blue', label: 'アカウント設定', route: '/settings/account' },
];

/** 登録先カレンダーの行の右に出す短い名前（「Apple カレンダー」だとiPhone SEで切れるため短くする）。 */
const CALENDAR_PROVIDER_SHORT_LABELS: Record<CalendarProviderId, string> = {
  apple: 'Apple',
  google: 'Google',
};

/**
 * 「一般設定」の行。表示順は 登録先カレンダー → 扶養の壁 → 外観。
 * 右に添える今の設定は保存データから作るため、画面の中で組み立てる。
 * 「外観」だけは実際のインライン切り替えUI (AppearanceRow) として別枠で描画する。
 *
 * 「通知設定」の行は削除した。アプリ独自通知は要件定義書24節のOUTに明記されており
 * （23節「アプリ独自のシフト通知はMVPでは作らない。カレンダーイベント側の通知機能を利用する」）、
 * 遷移先が無いまま置くと「準備中」のアラートが出て審査ガイドライン2.1に抵触するため。
 */
function useGeneralRows(): SettingsRow[] {
  const calendarProvider = useAppStore((state) => {
    const user = state.user;
    const activeWorkplace =
      user?.workplaces.find((w) => w.id === user.activeWorkplaceId) ?? user?.workplaces[0];
    return activeWorkplace?.settings.defaultCalendarProvider ?? 'apple';
  });
  const birthYear = useAppStore((state) => state.user?.settings.birthYear);

  return [
    {
      // 行どうしで色が重ならないよう、扶養の壁（オレンジ）と分けて薄い赤にする（2026-10-20 ユーザー決定）。
      icon: CalendarDays,
      tone: 'red',
      label: '登録先カレンダー',
      trailingLabel: CALENDAR_PROVIDER_SHORT_LABELS[calendarProvider],
      route: '/settings/calendar-providers',
    },
    {
      // 給与タブの扶養の壁カードと同じオレンジの三角（つながりが分かるように）。
      icon: TriangleAlert,
      tone: 'orange',
      label: '扶養の壁',
      trailingLabel: birthYear !== undefined ? `生まれ年 ${birthYear}年` : '未設定',
      // 扶養の壁の新しい画面（グループD）ができるまでは、生まれ年を入力できるアカウント設定へ。
      route: '/settings/account',
    },
  ];
}

// サポートと法的表記は、モックアップ通り1つの「サポート・その他」カードにまとめる。
// ただし利用規約・プライバシーポリシー・特定商取引法に基づく表記は、日本の法令上それぞれ
// 独立した開示事項のため、モックアップの1行への統合はせず3行のまま残す。
const SUPPORT_AND_LEGAL_ROWS: SettingsRow[] = [
  { icon: LifeBuoy, tone: 'neutral', label: 'ヘルプ・よくある質問', route: '/settings/legal/faq' },
  { icon: MessageCircle, tone: 'neutral', label: 'お問い合わせ', route: '/settings/legal/contact' },
  { icon: FileText, tone: 'neutral', label: '利用規約', route: '/settings/legal/terms' },
  {
    icon: ShieldCheck,
    tone: 'neutral',
    label: 'プライバシーポリシー',
    route: '/settings/legal/privacy',
  },
  {
    icon: ClipboardList,
    tone: 'neutral',
    label: '特定商取引法に基づく表記',
    route: '/settings/legal/tokushoho',
  },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
] as const;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** ボーダー区切り付きの1行分。`SettingsRowGroup`と`一般設定`セクション内の混在リストの両方から使う。 */
function NavRow({ row }: { row: SettingsRow }) {
  const theme = useTheme();
  const badge = useIconBadgeColors(row.tone);

  return (
    <Pressable
      onPress={() => router.push(row.route)}
      accessibilityRole="button"
      accessibilityLabel={row.trailingLabel ? `${row.label}、${row.trailingLabel}` : row.label}
      style={styles.row}
    >
      <IconBadge tone={row.tone} size={ROW_ICON_BADGE_SIZE}>
        <row.icon size={ROW_ICON_SIZE} color={badge.icon} />
      </IconBadge>
      <ThemedText style={styles.rowLabel} numberOfLines={1}>
        {row.label}
      </ThemedText>
      <View style={styles.rowRight}>
        {row.trailingLabel && (
          <ThemedText style={styles.trailingLabel} themeColor="textSecondary" numberOfLines={1}>
            {row.trailingLabel}
          </ThemedText>
        )}
        <ChevronRight size={20} color={theme.disabled} />
      </View>
    </Pressable>
  );
}

/** 行の間に挟む、アイコン分だけ左にインデントした極細の区切り線。 */
function RowSeparator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.border }]} />;
}

function SettingsRowGroup({ rows, caption }: { rows: SettingsRow[]; caption?: string }) {
  return (
    <View style={styles.group}>
      {caption && (
        <ThemedText type="caption1" style={styles.caption} themeColor="textSecondary">
          {caption}
        </ThemedText>
      )}
      <Card style={[styles.rowGroup, styles.cardShadow]}>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index > 0 && <RowSeparator />}
            <NavRow row={row} />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** 「外観」の実インライン切り替え行。マイカスタムタブの wageTypeToggle と同じピル型セグメントコントロール。 */
function AppearanceRow({ withTopSeparator }: { withTopSeparator: boolean }) {
  const theme = useTheme();
  const purpleBadge = useIconBadgeColors('purple');
  const user = useAppStore((state) => state.user);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const themeOverride = user?.settings.themeOverride ?? 'light';

  return (
    <View>
      {withTopSeparator && <RowSeparator />}
      <View style={styles.appearanceRow}>
        <IconBadge tone="purple" size={ROW_ICON_BADGE_SIZE}>
          <Palette size={ROW_ICON_SIZE} color={purpleBadge.icon} />
        </IconBadge>
        <ThemedText style={styles.rowLabel}>外観</ThemedText>
        <View style={[styles.themeToggle, { backgroundColor: theme.backgroundSelected }]}>
          {THEME_OPTIONS.map((option) => {
            const selected = themeOverride === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => updateSettings({ themeOverride: option.value })}
                style={[
                  styles.themeChoice,
                  selected && [
                    styles.themeChoiceSelected,
                    { backgroundColor: theme.backgroundElement },
                  ],
                ]}
              >
                <ThemedText
                  style={[
                    styles.themeChoiceLabel,
                    {
                      color: selected ? theme.text : theme.textSecondary,
                      fontWeight: selected ? '600' : '500',
                    },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** 設定タブ: 一般的なアプリ設定（アカウント・登録先カレンダー・扶養の壁・外観・規約など）。シフト登録の挙動自体は「マイカスタム」タブが担う。 */
export default function SettingsTab() {
  const theme = useTheme();
  const goldBadge = useIconBadgeColors('gold');
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const generalRows = useGeneralRows();

  return (
    <Screen>
      <TabTitleRow title="設定" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 横長のバナー（320×50）。PROでは自動で消える。下のカードとは scrollContent の gap（16pt）で離す */}
        <AdPlaceholder slot="settings" />

        {/* PROの宣伝は無料の人だけ。PROの人は見出しの右の金の「PRO」で分かるので、カードごと出さない */}
        {!isPro && (
          <Card style={[styles.proCard, styles.cardShadow]}>
            <View style={styles.proHeading}>
              <IconBadge tone="gold" size={ROW_ICON_BADGE_SIZE}>
                <Star size={14} color={goldBadge.icon} fill={goldBadge.icon} />
              </IconBadge>
              <ThemedText type="headline">シフToカレ PRO</ThemedText>
            </View>
            <ThemedText type="footnote" themeColor="textSecondary">
              読み取り回数が15回に増え、扶養の壁アラート・過去月の給与・掛け持ち・広告非表示が使えます。
            </ThemedText>
            {/* 価格の右にボタン（Stitchの案どおり。2026-10-20 ユーザー決定）。横いっぱいの主ボタン（17pt）では
                iPhone SEで文字が切れるため、このボタンだけ文字15pt・左右の余白16ptの小さめのピル型にする */}
            <View style={styles.proPriceRow}>
              <View style={styles.proPrice}>
                <ThemedText type="title3" style={styles.proPriceAmount}>
                  ¥330
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary">
                  / 月
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/paywall')}
                style={({ pressed }) => [
                  styles.proButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText
                  type="subheadline"
                  numberOfLines={1}
                  style={[styles.proButtonLabel, { color: theme.onPrimary }]}
                >
                  PROにアップグレード
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        )}

        <SettingsRowGroup caption="アカウント" rows={ACCOUNT_ROWS} />

        <View style={styles.group}>
          <ThemedText type="caption1" style={styles.caption} themeColor="textSecondary">
            一般設定
          </ThemedText>
          <Card style={[styles.rowGroup, styles.cardShadow]}>
            {generalRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <RowSeparator />}
                <NavRow row={row} />
              </View>
            ))}
            <AppearanceRow withTopSeparator={generalRows.length > 0} />
          </Card>
        </View>

        <SettingsRowGroup caption="サポート・その他" rows={SUPPORT_AND_LEGAL_ROWS} />

        <View style={styles.footer}>
          <ThemedText style={styles.footerLine1} themeColor="textSecondary">
            シフToカレ for iOS
          </ThemedText>
          <ThemedText style={styles.footerLine2} themeColor="textSecondary">
            バージョン {APP_VERSION}
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset,
  },
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  proCard: {
    gap: Spacing.two + Spacing.half,
  },
  proHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  proButton: {
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proButtonLabel: {
    fontWeight: '600',
  },
  proPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  proPriceAmount: {
    fontWeight: '700',
  },
  group: {
    gap: 6,
  },
  caption: {
    paddingHorizontal: Spacing.one,
  },
  rowGroup: {
    padding: 0,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trailingLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: Radius.small,
    padding: 2,
  },
  themeChoice: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  themeChoiceSelected: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  themeChoiceLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: 12,
    paddingBottom: Spacing.two,
  },
  footerLine1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  footerLine2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400',
  },
});
