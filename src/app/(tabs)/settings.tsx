import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  LifeBuoy,
  MessageCircle,
  Palette,
  RefreshCw,
  ShieldCheck,
  Star,
  User,
  UserCog,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AdPlaceholder } from '@/components/ad-placeholder';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing, type IconBadgeTone } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/useAppStore';

interface SettingsRow {
  icon: LucideIcon;
  tone: IconBadgeTone;
  label: string;
  /** カレンダー同期設定の「iOSカレンダー」のように、chevronの手前に添える小さな補足テキスト。 */
  trailingLabel?: string;
  /** 指定されていれば遷移し、なければ`showComingSoon`にフォールバックする。 */
  route?: Href;
}

const ROW_ICON_BADGE_SIZE = 28;
const ROW_ICON_SIZE = 18;

const ACCOUNT_ROWS: SettingsRow[] = [
  { icon: UserCog, tone: 'blue', label: 'アカウント設定', route: '/settings/account' },
];

// 「外観」だけは実際のインライン切り替えUI (AppearanceRow) として別枠で描画するため、
// このセクション用の配列には含めない。表示順は 通知設定 → カレンダー同期設定 → 外観。
const GENERAL_ROWS: SettingsRow[] = [
  { icon: Bell, tone: 'red', label: '通知設定' },
  {
    icon: RefreshCw,
    tone: 'orange',
    label: 'カレンダー同期設定',
    trailingLabel: 'iOSカレンダー',
    route: '/settings/calendar-providers',
  },
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

function showComingSoon() {
  Alert.alert('準備中', 'この機能は近日公開予定です。');
}

/** ボーダー区切り付きの1行分。`SettingsRowGroup`と`一般設定`セクション内の混在リストの両方から使う。 */
function NavRow({ row }: { row: SettingsRow }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={row.route ? () => router.push(row.route!) : showComingSoon}
      style={styles.row}
    >
      <IconBadge tone={row.tone} size={ROW_ICON_BADGE_SIZE}>
        <row.icon size={ROW_ICON_SIZE} color={theme.text} />
      </IconBadge>
      <ThemedText style={styles.rowLabel}>{row.label}</ThemedText>
      <View style={styles.rowRight}>
        {row.trailingLabel && (
          <ThemedText style={styles.trailingLabel} themeColor="textSecondary">
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
        <ThemedText style={styles.caption} themeColor="textSecondary">
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

/** 「外観」の実インライン切り替え行。テンプレタブの wageTypeToggle と同じピル型セグメントコントロール。 */
function AppearanceRow({ withTopSeparator }: { withTopSeparator: boolean }) {
  const theme = useTheme();
  const user = useAppStore((state) => state.user);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const themeOverride = user?.settings.themeOverride ?? 'light';

  return (
    <View>
      {withTopSeparator && <RowSeparator />}
      <View style={styles.appearanceRow}>
        <IconBadge tone="purple" size={ROW_ICON_BADGE_SIZE}>
          <Palette size={ROW_ICON_SIZE} color={theme.text} />
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

/** 設定タブ: 一般的なアプリ設定（アカウント・通知・外観・規約など）。シフト登録の挙動自体は「テンプレ」タブが担う。 */
export default function SettingsTab() {
  const theme = useTheme();
  const resolvedScheme = useResolvedColorScheme();
  const proCardBackground = resolvedScheme === 'dark' ? theme.backgroundElement : '#F5F5F7';
  const profileName = useAppStore(
    (state) => state.user?.displayName || state.user?.shiftName || '匿名ユーザー',
  );
  const isPro = useAppStore((state) => state.user?.settings.isPro ?? false);
  const setDisplayName = useAppStore((state) => state.setDisplayName);
  const [isNameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profileName);

  const handleOpenNameDialog = () => {
    setNameDraft(profileName);
    setNameDialogOpen(true);
  };

  const handleSaveName = () => {
    setDisplayName(nameDraft.trim());
    setNameDialogOpen(false);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">設定</ThemedText>
        <AdPlaceholder slot="settings" size="inline" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card
          onPress={handleOpenNameDialog}
          style={[
            styles.profileCard,
            { backgroundColor: theme.backgroundElement },
            styles.cardShadow,
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isPro ? theme.orange : theme.backgroundSelected },
              ]}
            >
              {isPro ? (
                <Star size={32} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <User size={36} color={theme.textSecondary} />
              )}
            </View>
            <View style={styles.profileNameColumn}>
              <ThemedText type="headline" style={styles.profileName}>
                {profileName}
              </ThemedText>
              {isPro && (
                <View style={[styles.proPill, { backgroundColor: theme.orange }]}>
                  <ThemedText style={styles.proPillLabel}>PRO</ThemedText>
                </View>
              )}
            </View>
            <ChevronRight size={20} color={theme.disabled} />
          </View>
        </Card>

        <Card style={[styles.proCard, { backgroundColor: proCardBackground }, styles.cardShadow]}>
          <View style={styles.proHeading}>
            <View style={[styles.proBadge, { backgroundColor: theme.orange }]}>
              <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <ThemedText style={styles.proTitle}>シフトカレンダーAI PRO</ThemedText>
          </View>
          <ThemedText type="footnote" themeColor="textSecondary">
            月別集計・給与見込みに加え、広告の非表示や画像シフト読み取り枠の拡大が無制限で利用できます。
          </ThemedText>
          <View style={styles.proPriceRow}>
            <View style={styles.proPrice}>
              <ThemedText style={styles.proPriceAmount}>¥300</ThemedText>
              <ThemedText style={[styles.proPriceUnit, { color: theme.textSecondary }]}>
                / 月
              </ThemedText>
            </View>
            {isPro ? (
              <View style={[styles.proButton, { backgroundColor: theme.disabled }]}>
                <ThemedText style={styles.proButtonLabel}>ご利用中です</ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/paywall')}
                style={[styles.proButton, { backgroundColor: '#1C1C1E' }, styles.cardShadow]}
              >
                <ThemedText style={styles.proButtonLabel}>PROにアップグレード</ThemedText>
              </Pressable>
            )}
          </View>
        </Card>

        <SettingsRowGroup caption="アカウント" rows={ACCOUNT_ROWS} />

        <View style={styles.group}>
          <ThemedText style={styles.caption} themeColor="textSecondary">
            一般設定
          </ThemedText>
          <Card style={[styles.rowGroup, styles.cardShadow]}>
            {GENERAL_ROWS.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <RowSeparator />}
                <NavRow row={row} />
              </View>
            ))}
            <AppearanceRow withTopSeparator={GENERAL_ROWS.length > 0} />
          </Card>
        </View>

        <SettingsRowGroup caption="サポート・その他" rows={SUPPORT_AND_LEGAL_ROWS} />

        <View style={styles.footer}>
          <ThemedText style={styles.footerLine1} themeColor="textSecondary">
            Shift Calendar AI for iOS
          </ThemedText>
          <ThemedText style={styles.footerLine2} themeColor="textSecondary">
            バージョン {APP_VERSION}
          </ThemedText>
        </View>
      </ScrollView>

      <Dialog visible={isNameDialogOpen} onClose={() => setNameDialogOpen(false)}>
        <ThemedText type="smallBold">表示名を編集</ThemedText>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder="表示名を入力"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.nameInput,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
          autoFocus
        />
        <PrimaryButton
          label="保存"
          onPress={handleSaveName}
          disabled={nameDraft.trim().length === 0}
        />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  profileCard: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNameColumn: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  profileName: {
    minWidth: 0,
  },
  proPill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  proPillLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  proCard: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: 10,
  },
  proHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proBadge: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  proPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  proPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  proPriceAmount: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  proPriceUnit: {
    fontSize: 12,
    lineHeight: 16,
  },
  proButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  proButtonLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  group: {
    gap: 6,
  },
  caption: {
    paddingHorizontal: Spacing.one,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
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
