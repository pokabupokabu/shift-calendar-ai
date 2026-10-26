import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect, type Href } from 'expo-router';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  Gift,
  LifeBuoy,
  MessageCircle,
  Palette,
  ShieldCheck,
  Star,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { TabTitleRow } from '@/components/header-status';
import { IconBadge } from '@/components/icon-badge';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ageBracketForYear } from '@/constants/dependencyWalls';
import { BottomTabInset, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useIconBadgeColors } from '@/hooks/use-icon-badge-colors';
import { usePaywallColors } from '@/hooks/use-paywall-colors';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProviderId } from '@/models/calendarEvent';
import { getConnectedProviders } from '@/services/calendar/getConnectedProviders';
import { useAppStore } from '@/store/useAppStore';
import { useShiftSessionStore } from '@/store/useShiftSessionStore';
import { PRO_SCAN_LIMIT } from '@/utils/scanQuota';

interface SettingsRow {
  icon: LucideIcon;
  tone: IconBadgeTone;
  label: string;
  /** カレンダー連携の「Apple」のように、chevronの手前に添える今の設定（灰色の小さな文字）。 */
  trailingLabel?: string;
  /** タップ時の遷移先。全ての行が遷移先を持つ（未実装の行は置かない）。 */
  route: Href;
}

const ROW_ICON_BADGE_SIZE = 28;
const ROW_ICON_SIZE = 18;

/** PRO のカードの箇条書き（docs/ui-review/group-e.md「コミット前の直し」）。 */
const PRO_POINTS = [
  `スキャン${PRO_SCAN_LIMIT}回／高度なスキャン`,
  '扶養の壁アラート',
  'その他さまざまな機能',
];

/** カレンダー連携の行の右に出す短い名前（「Apple カレンダー」だとiPhone SEで切れるため短くする）。 */
const CALENDAR_PROVIDER_SHORT_LABELS: Record<CalendarProviderId, string> = {
  apple: 'Apple',
  google: 'Google',
};

/** 連携済みのカレンダーを「Apple」「Google」「Apple・Google」、無ければ「未連携」にする。 */
function connectedProvidersLabel(ids: CalendarProviderId[]): string {
  if (ids.length === 0) return '未連携';
  return ids.map((id) => CALENDAR_PROVIDER_SHORT_LABELS[id]).join('・');
}

/**
 * 連携済みのカレンダー。連携の画面から戻ってきたときに取り直すため、タブが表示されるたびに確認する
 * （マイカスタムタブと同じやり方）。確認が終わるまでは undefined で、右の文字を出さない（ちらつき防止）。
 */
function useConnectedProviders(): CalendarProviderId[] | undefined {
  const [connectedIds, setConnectedIds] = useState<CalendarProviderId[]>();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getConnectedProviders().then((ids) => {
        if (active) setConnectedIds(ids);
      });
      return () => {
        active = false;
      };
    }, []),
  );
  return connectedIds;
}

/**
 * 「一般設定」の行。表示順は カレンダー連携 → 扶養の壁 → 外観（docs/ui-review/group-d.md 構成③）。
 * 右に添える今の設定は保存データや連携状態から作るため、画面の中で組み立てる。
 * 「外観」だけは実際のインライン切り替えUI (AppearanceRow) として別枠で描画する。
 *
 * 「通知設定」の行は削除した。アプリ独自通知は要件定義書24節のOUTに明記されており
 * （23節「アプリ独自のシフト通知はMVPでは作らない。カレンダーイベント側の通知機能を利用する」）、
 * 遷移先が無いまま置くと「準備中」のアラートが出て審査ガイドライン2.1に抵触するため。
 */
function useGeneralRows(): SettingsRow[] {
  const connectedProviders = useConnectedProviders();
  const ageBracket = useAppStore((state) => state.user?.settings.ageBracket);
  // 年齢区分は今年の答えだけを使う（去年の答えは「未設定」に戻す。group-d.md の決定7）
  const isAge19to22 = ageBracketForYear(ageBracket, new Date().getFullYear());

  return [
    {
      // 行どうしで色が重ならないよう、扶養の壁（オレンジ）と分けて薄い赤にする（2026-10-20 ユーザー決定）。
      // 旧「登録先カレンダー」。登録先は勤務先ごとにマイカスタムで選ぶので、ここは連携の状態を出す（構成④）。
      icon: CalendarDays,
      tone: 'red',
      label: 'カレンダー連携',
      trailingLabel:
        connectedProviders !== undefined ? connectedProvidersLabel(connectedProviders) : undefined,
      route: '/settings/calendar-providers',
    },
    {
      // 給与タブの扶養の壁カードと同じオレンジの三角（つながりが分かるように）。
      icon: TriangleAlert,
      tone: 'orange',
      label: '扶養の壁',
      trailingLabel: isAge19to22 === undefined ? '未設定' : isAge19to22 ? '19〜22歳' : 'それ以外',
      route: '/settings/dependency-wall',
    },
  ];
}

/** 「特典」の行（構成②）。提出用の版でも出す。押すとAppleのオファーコードの入力などができる画面へ。 */
const PERK_ROWS: SettingsRow[] = [
  { icon: Gift, tone: 'blue', label: 'プロモーション特典', route: '/settings/promotion' },
];

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

/** 「外観」の実インライン切り替え行。扶養の壁の画面の2択と同じ部品（SegmentedControl）の小さい版。 */
function AppearanceRow({ withTopSeparator }: { withTopSeparator: boolean }) {
  const purpleBadge = useIconBadgeColors('purple');
  const themeOverride = useAppStore((state) => state.user?.settings.themeOverride ?? 'light');
  const updateSettings = useAppStore((state) => state.updateSettings);

  return (
    <View>
      {withTopSeparator && <RowSeparator />}
      <View style={styles.appearanceRow}>
        <IconBadge tone="purple" size={ROW_ICON_BADGE_SIZE}>
          <Palette size={ROW_ICON_SIZE} color={purpleBadge.icon} />
        </IconBadge>
        <ThemedText style={styles.rowLabel}>外観</ThemedText>
        <SegmentedControl
          size="compact"
          accessibilityLabel="外観"
          options={THEME_OPTIONS}
          value={themeOverride}
          onChange={(value) => updateSettings({ themeOverride: value })}
        />
      </View>
    </View>
  );
}

async function performReset() {
  await AsyncStorage.clear();
  useAppStore.getState().resetAll();
  useShiftSessionStore.getState().reset();
  router.dismissAll();
  router.replace('/tutorial');
}

/**
 * いちばん下の「データを初期化」の行（構成③・決定9）。赤い文字で、押すと確認の小窓を出す。
 * 専用の画面は作らないので、右の「›」は付けない。
 */
function ResetDataRow() {
  const theme = useTheme();
  const redBadge = useIconBadgeColors('red');

  const handlePress = () => {
    Alert.alert('データを初期化しますか？', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '初期化する', style: 'destructive', onPress: performReset },
    ]);
  };

  return (
    <Card style={[styles.rowGroup, styles.cardShadow]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="データを初期化"
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
      >
        <IconBadge tone="red" size={ROW_ICON_BADGE_SIZE}>
          <Trash2 size={ROW_ICON_SIZE} color={redBadge.icon} />
        </IconBadge>
        <ThemedText style={[styles.rowLabel, { color: theme.danger }]} numberOfLines={1}>
          データを初期化
        </ThemedText>
      </Pressable>
    </Card>
  );
}

/**
 * 設定タブ: 一般的なアプリ設定（カレンダー連携・扶養の壁・外観・特典・規約・データの初期化）。
 * シフト登録の挙動自体は「マイカスタム」タブが担う。
 * 旧「アカウント設定」の画面は無くし、中身を扶養の壁・プロモーション特典の画面とこのタブへ分けた
 * （docs/ui-review/group-d.md 構成①）。
 */
export default function SettingsTab() {
  const goldBadge = useIconBadgeColors('gold');
  const paywallColors = usePaywallColors();
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
            {/* 3行の箇条書き（2026-10-27 ユーザーの要望）。行頭の「・」をそろえるため、記号と文を別の列にする */}
            <View style={styles.proPoints}>
              {PRO_POINTS.map((point) => (
                <View key={point} style={styles.proPointRow}>
                  <ThemedText type="footnote" themeColor="textSecondary">
                    ・
                  </ThemedText>
                  <ThemedText
                    type="footnote"
                    themeColor="textSecondary"
                    style={styles.proPointText}
                  >
                    {point}
                  </ThemedText>
                </View>
              ))}
            </View>
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
                // 課金画面の表の PRO の列と同じ地と文字の色（2026-10-27 ユーザーの要望）
                style={({ pressed }) => [
                  styles.proButton,
                  {
                    backgroundColor: paywallColors.proColumnBackground,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="subheadline"
                  numberOfLines={1}
                  style={[styles.proButtonLabel, { color: paywallColors.proColumnText }]}
                >
                  PROにアップグレード
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        )}

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

        <SettingsRowGroup caption="特典" rows={PERK_ROWS} />

        <SettingsRowGroup caption="サポート・その他" rows={SUPPORT_AND_LEGAL_ROWS} />

        <ResetDataRow />

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
  proPoints: {
    gap: Spacing.half,
  },
  proPointRow: {
    flexDirection: 'row',
  },
  proPointText: {
    flex: 1,
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
