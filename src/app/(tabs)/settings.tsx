import {
  Bell,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Crown,
  FileText,
  LifeBuoy,
  Languages,
  LogIn,
  Palette,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SettingsRow {
  icon: LucideIcon;
  label: string;
}

interface SettingsSection {
  caption: string;
  rows: SettingsRow[];
}

const SECTIONS: SettingsSection[] = [
  {
    caption: 'アカウント',
    rows: [
      { icon: User, label: 'アカウント設定' },
      { icon: LogIn, label: 'ログイン方法' },
    ],
  },
  {
    caption: '一般',
    rows: [
      { icon: Bell, label: '通知設定' },
      { icon: Palette, label: '外観' },
      { icon: Languages, label: '言語' },
    ],
  },
  {
    caption: 'サポート',
    rows: [
      { icon: LifeBuoy, label: 'ヘルプ・よくある質問' },
      { icon: CircleHelp, label: 'お問い合わせ' },
    ],
  },
];

const LEGAL_ROWS: SettingsRow[] = [
  { icon: FileText, label: '利用規約' },
  { icon: ShieldCheck, label: 'プライバシーポリシー' },
  { icon: ClipboardList, label: '特定商取引法に基づく表記' },
];

function showComingSoon() {
  Alert.alert('準備中', 'この機能は近日公開予定です。');
}

function SettingsRowGroup({ rows, caption }: { rows: SettingsRow[]; caption?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {caption && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
          {caption}
        </ThemedText>
      )}
      <Card style={styles.rowGroup}>
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={showComingSoon}
            style={[styles.row, index > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}
          >
            <row.icon size={IconSize.medium} color={theme.text} />
            <ThemedText style={styles.rowLabel}>{row.label}</ThemedText>
            <ChevronRight size={IconSize.medium} color={theme.textSecondary} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/** 設定タブ: 一般的なアプリ設定（アカウント・通知・外観・規約など）。シフト登録の挙動自体は「テンプレ」タブが担う。 */
export default function SettingsTab() {
  const theme = useTheme();

  return (
    <Screen>
      <ThemedText type="subtitle">設定</ThemedText>

      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <User size={IconSize.large} color={theme.textSecondary} />
        </View>
        <ThemedText type="default">匿名ユーザー</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.proCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.proHeading}>
            <Crown size={IconSize.medium} color={theme.primary} />
            <ThemedText type="smallBold" themeColor="primary">
              シフトカレンダーAI PRO
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            月別集計・給与見込みに加え、広告の非表示やシフト読み取り枠の拡大が利用できます
          </ThemedText>
          <PrimaryButton label="PROにアップグレード" onPress={showComingSoon} />
        </Card>

        {SECTIONS.map((section) => (
          <SettingsRowGroup key={section.caption} caption={section.caption} rows={section.rows} />
        ))}
        <SettingsRowGroup rows={LEGAL_ROWS} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset,
  },
  proCard: {
    gap: Spacing.two,
  },
  proHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  group: {
    gap: Spacing.one,
  },
  caption: {
    paddingHorizontal: Spacing.one,
  },
  rowGroup: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowLabel: {
    flex: 1,
  },
});
